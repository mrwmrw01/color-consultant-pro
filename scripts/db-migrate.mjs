#!/usr/bin/env node
/**
 * Bring the database schema up to date before the app starts (`npm start`).
 *
 *   - Normal case: `prisma migrate deploy`.
 *   - Database built with `prisma db push` (tables but no migration history,
 *     Prisma error P3005): sync it with a non-destructive `db push` (refuses
 *     anything that would lose data), then record every migration as applied
 *     so future deploys use `migrate deploy`.
 *   - A deploy of a build that predates 20260203000000_reconcile_schema_drift
 *     onto an empty database leaves 20260204000000_add_performance_indexes
 *     marked failed (P3009). That migration is only CREATE INDEX IF NOT EXISTS,
 *     so it is marked rolled back and retried after the reconcile migration.
 *
 * Exits non-zero (so the app does not start against a mismatched schema) when
 * the database cannot be brought up to date.
 */
import { spawnSync } from "node:child_process"
import { existsSync, readdirSync, statSync } from "node:fs"
import path from "node:path"

const root = process.cwd()
const migrationsDir = path.join(root, "prisma", "migrations")
const localPrisma = path.join(root, "node_modules", ".bin", "prisma")
const RETRYABLE_FAILED_MIGRATION = "20260204000000_add_performance_indexes"

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

function deploy() {
  return prisma(["migrate", "deploy"])
}

let result = deploy()

if (!result.ok && result.output.includes("P3005")) {
  log("Database has tables but no migration history (created with `prisma db push`). Baselining.")
  const push = prisma(["db", "push", "--skip-generate"])
  if (!push.ok) {
    fail("Schema sync refused (it would lose data or failed). Resolve manually before deploying.", push.output)
  }
  for (const name of migrationNames()) {
    const resolved = prisma(["migrate", "resolve", "--applied", name])
    if (!resolved.ok) fail(`Could not mark ${name} as applied`, resolved.output)
  }
  log(`Baselined ${migrationNames().length} migrations.`)
  result = deploy()
}

if (
  !result.ok &&
  result.output.includes("P3009") &&
  result.output.includes(RETRYABLE_FAILED_MIGRATION)
) {
  log(`Retrying ${RETRYABLE_FAILED_MIGRATION} after the schema reconcile migration.`)
  const rolledBack = prisma(["migrate", "resolve", "--rolled-back", RETRYABLE_FAILED_MIGRATION])
  if (!rolledBack.ok) fail(`Could not reset ${RETRYABLE_FAILED_MIGRATION}`, rolledBack.output)
  result = deploy()
}

if (!result.ok) {
  fail("Migration failed.", result.output)
}

console.log(result.output.trim())
log("Database schema is up to date.")
