#!/usr/bin/env node
/**
 * Bring the database schema up to date before the app starts (`npm start`).
 *
 * Normally this is just `prisma migrate deploy`. Databases that were partly
 * managed with `prisma db push` need more care, so it also handles:
 *
 *   - P3005, tables but no migration history: sync the schema with a
 *     non-destructive `db push`, then record every migration as applied.
 *   - P3018, a migration failed because its tables, columns or constraints
 *     already exist (created by `db push`): record it as applied and
 *     reconcile with `db push` at the end.
 *   - P3009, an earlier failed migration blocks the rest: mark it rolled back
 *     and try it again; it then either applies or hits the case above.
 *
 * `db push` runs without --accept-data-loss, so it refuses anything that would
 * drop data. Exits non-zero (the app does not start against a mismatched
 * schema) when the database cannot be brought up to date safely.
 */
import { spawnSync } from "node:child_process"
import { existsSync, readdirSync, statSync } from "node:fs"
import path from "node:path"

const root = process.cwd()
const migrationsDir = path.join(root, "prisma", "migrations")
const localPrisma = path.join(root, "node_modules", ".bin", "prisma")
// Postgres: duplicate_table / duplicate_column / duplicate_object
const ALREADY_EXISTS = new Set(["42P07", "42701", "42710"])
const MAX_ATTEMPTS = 20

function prisma(args) {
  const [cmd, cmdArgs] = existsSync(localPrisma)
    ? [localPrisma, args]
    : ["npx", ["--no-install", "prisma", ...args]]
  const result = spawnSync(cmd, cmdArgs, { encoding: "utf8", env: process.env })
  const output = `${result.stdout || ""}${result.stderr || ""}`
  return { ok: result.status === 0, output }
}

function log(message) {
  console.log(`[db-migrate] ${message}`)
}

function fail(message, output) {
  if (output) console.error(output)
  console.error(`[db-migrate] ${message}`)
  process.exit(1)
}

function migrationNames() {
  return readdirSync(migrationsDir)
    .filter((name) => statSync(path.join(migrationsDir, name)).isDirectory())
    .sort()
}

function resolveMigration(flag, name) {
  const resolved = prisma(["migrate", "resolve", flag, name])
  if (!resolved.ok) fail(`Could not mark ${name} ${flag.replace("--", "")}`, resolved.output)
}

function pushSchema() {
  const push = prisma(["db", "push", "--skip-generate"])
  if (!push.ok) {
    fail("Schema sync refused (it would lose data or failed). Resolve manually before deploying.", push.output)
  }
}

let reconcile = false
const retried = new Set()
let result

for (let attempt = 0; ; attempt++) {
  if (attempt >= MAX_ATTEMPTS) fail("Gave up after too many migration attempts.", result?.output)
  result = prisma(["migrate", "deploy"])
  if (result.ok) break
  const output = result.output

  if (output.includes("P3005")) {
    log("Database has tables but no migration history (created with `prisma db push`). Baselining.")
    pushSchema()
    for (const name of migrationNames()) resolveMigration("--applied", name)
    log(`Baselined ${migrationNames().length} migrations.`)
    continue
  }

  const failedName = output.match(/Migration name: (\S+)/)?.[1]
  const errorCode = output.match(/Database error code: (\S+)/)?.[1]
  if (output.includes("P3018") && failedName && ALREADY_EXISTS.has(errorCode)) {
    log(`${failedName}: its objects already exist (created with \`prisma db push\`); recording it as applied.`)
    resolveMigration("--applied", failedName)
    reconcile = true
    continue
  }

  const blockedBy = output.match(/The `([^`]+)` migration started at/)?.[1]
  if (output.includes("P3009") && blockedBy && !retried.has(blockedBy)) {
    log(`${blockedBy} failed in an earlier deploy; retrying it.`)
    retried.add(blockedBy)
    resolveMigration("--rolled-back", blockedBy)
    continue
  }

  fail("Migration failed.", output)
}

console.log(result.output.trim())
if (reconcile) {
  log("Reconciling objects created outside migrations with the schema.")
  pushSchema()
}
log("Database schema is up to date.")
