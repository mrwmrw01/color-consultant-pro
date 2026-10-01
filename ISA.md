---
task: Finish Color Consultant Pro — consolidate, build, test, commit, deployment-ready
slug: finish-color-consultant-pro
effort: E3
phase: complete
progress: 35/35
mode: algorithm
started: 2026-10-01
updated: 2026-10-01
project: color-consultant-pro
---

# Color Consultant Pro — Ideal State Artifact

## Problem

The client's app has been under development since Jan 2026 and is fragmented:
`main` (Field Beta v0.1, the shipped zip) and the working branch
`cleanup/phase-1-dependencies` have diverged (1 vs 8 commits). The shipped zip does
not even build — `app/api/admin/colors/[id]/route.ts` imports the missing
`lib/admin-auth.ts`. All of April's critical work is uncommitted or untracked:
the **Synopsis Draft rewrite** (curated drag-and-drop editor, DOCX v2 exporter
matching the hand-crafted painter format, migration, E2E spec), **exterior paint
support** (surfaces, rooms, product-line mismatch detection), and **client CSV
import**. The deployed app at paint.weadtech.net is older than `main`
(`/api/health` 404s). The consultant's core deliverable — a painter-usable color
synopsis — is not shippable in this state.

## Vision

One clean git branch containing every piece of work done to date; `npm run build`
passes; `npx prisma migrate deploy` is clean; the E2E suite is green; the Synopsis
Draft editor is the production synopsis path and exports a DOCX that matches the
hand-crafted format; a developer can take the runbook and update
paint.weadtech.net in one sitting. The consultant opens the app, curates the
synopsis, and emails the painter a finished document.

## Out of Scope

- Live deployment to paint.weadtech.net in this pass (runbook only)
- New features beyond what exists in the repo's own uncommitted work
- Re-enabling AI suggestions (FEATURE_AI_SUGGESTIONS=false)
- PDF export improvements, native apps, multi-user collaboration, offline mode
- Cleaning up the AI-generated planning docs (left as-is, untracked/ignored)

## Principles

- Every feature shipped is verified by a real tool call, never prose alone
- No secrets in git; .env stays ignored
- Never rewrite history; integration happens on a fresh branch
- One owner per file/symbol during parallel work
- The Synopsis Draft editor is the primary synopsis path; the old generator
  remains reachable as fallback until validated in the field

## Constraints

- Next.js 14 App Router, TypeScript strict (`tsc --noEmit` must pass)
- Prisma 6.7 + PostgreSQL (local dev: localhost:5434, db `color_consultant_db`)
- Photos in AWS S3 (`colorguru-photos`); live creds only in prod .env
- React 18; dnd-kit for drag-and-drop; docx@9 for DOCX export
- E2E via Playwright against a local dev server + local DB
- Production host of record: paint.weadtech.net

## Goal

Produce a single clean git branch containing all of the repository's work —
merged `main` plus exterior support, client import, and the Synopsis Draft
editor as the production synopsis tool — where `npm run build` exits 0,
`prisma migrate deploy` applies cleanly, the E2E suite passes, everything is
committed, and a step-by-step runbook at the repo root describes shipping it to
paint.weadtech.net.

## Criteria

- [C1] `npm run build` in the project root exits 0 (includes type-check)
- [C2] `npx tsc --noEmit` exits 0
- [C3] Final branch's history contains `main` HEAD `1b802e0` as an ancestor
- [C4] `lib/admin-auth.ts` exists in the final tree (admin routes import it)
- [C5] No `color-consultant-pro-main/` directory inside the project root
- [C6] `npx prisma migrate status` reports 0 unapplied migrations locally
- [C7] `prisma/schema.prisma` contains model `SynopsisDraft` and generation
      succeeds (`npx prisma generate` exits 0)
- [C8] GET `/api/projects/:id/synopsis-draft` returns 200 JSON for a real project
- [C9] PUT `/api/projects/:id/synopsis-draft` persists an edited structure (200)
- [C10] POST `/api/projects/:id/synopsis-draft/reset` re-seeds from annotations
- [C11] POST `/api/projects/:id/synopsis-draft/export` returns a DOCX
       (content-type includes `document.wordprocessingml`)
- [C12] Project detail page renders an "Edit Synopsis" link to `/synopsis-draft`
- [C13] Synopsis editor page renders "Client Information", "Color Summary",
       "Specifications" sections
- [C14] Editor uses dnd-kit sortable for group/column reordering (grep)
- [C15] Editor shows save-state indicator ("All changes saved" / unsaved)
- [C16] Exported DOCX text contains the client name (unzip document.xml check)
- [C17] `SURFACE_TYPES` includes exterior entries (e.g. "Siding - Lap/Clapboard")
- [C18] `ROOM_HIERARCHY` includes "Exterior - Body" etc.
- [C19] `detectProductMismatch` exists in `lib/types.ts` and returns the 3
       expected mismatch types for probe inputs
- [C20] Client import API route exists and rejects non-CSV content
- [C21] Client import dialog is wired into the clients list page
- [C22] Playwright `tests/e2e/synopsis-draft.spec.ts` passes (≥80% of tests)
- [C23] Playwright `tests/e2e/auth.spec.ts` passes 100%
- [C24] Playwright `tests/e2e/projects.spec.ts` passes 100%
- [C25] No `TODO|FIXME|XXX|HACK` markers in `app/ components/ lib/ hooks/`
- [C26] `.gitignore` covers node_modules, .next, .env, logs, screenshots,
       .playwright-cli, stray automation scripts
- [C27] Final branch has logical commits: merge of main, exterior support,
       synopsis draft, client import, build/doc fixes
- [C28] `DEPLOY_RUNBOOK.md` at repo root with paint.weadtech.net steps
- [C29] `git status` on the final branch: clean (no modified/untracked except
       ignored)
- [C30] Old synopsis generator route still exists (fallback, not deleted)
- [C31] Dev server `/` and `/auth/signin` return 200
- [C32] No committed secret: `git grep -lE 'AWS_SECRET|sk-ant-|NEXTAUTH_SECRET='` on
       tracked files returns nothing
- Anti: [A1] Build output contains no error referencing `color-consultant-pro-main/`
- Anti: [A2] `git log` shows no rewritten/force-pushed history (reflog intact)
- Anti: [A3] No `.env` variant with live values is tracked (only .env.example/.env.test)
- Anti: [A4] Auto-save annotations still present (grep `autoSaveAnnotatedPhoto`)

## Test Strategy

| isc | type | check | threshold | tool |
| --- | ---- | ----- | --------- | ---- |
| C1 | build | exit code | =0 | bash `npm run build` |
| C2 | build | exit code | =0 | bash `npx tsc --noEmit` |
| C3 | git | ancestry | 1b802e0 in log | bash `git merge-base --is-ancestor` |
| C4 | file | exists | yes | read/grep |
| C5 | fs | dir absent | yes | bash `test ! -d` |
| C6 | db | migrate status | 0 unapplied | bash `npx prisma migrate status` |
| C7 | db | model + generate | exit 0 | grep schema + `prisma generate` |
| C8-C11 | api | HTTP status/body | 200 | curl against dev server |
| C12 | ui | link present | grep | grep project-detail.tsx |
| C13 | ui | headings visible | E2E | Playwright spec |
| C14 | code | dnd-kit imports | grep | grep editor |
| C15 | ui | indicator | E2E | Playwright spec |
| C16 | docx | unzip + grep text | match | bash |
| C17-C19 | code | entries/functions | grep + node probe | bash |
| C20-C21 | code | route + wiring | grep/curl | bash |
| C22-C24 | e2e | pass rate | ≥80%, 100%, 100% | `npx playwright test` |
| C25 | code | zero markers | grep -c =0 | grep |
| C26 | gitignore | patterns present | grep | grep |
| C27-C28 | git/docs | commits + file | grep | bash |
| C29 | git | clean | porcelain empty | bash |
| C30 | code | route exists | test -f | bash |
| C31 | http | 200 | curl | curl |
| C32 | security | no match | grep -c =0 | bash |
| A1-A4 | anti | absent | probe | grep/git |

## Features

- F1 `repo-consolidation` | satisfies: C3-C5, C26-C29, C32, A1-A3 | depends_on: — | parallelizable: no
- F2 `synopsis-draft-ship` | satisfies: C7-C16, C22, C30 | depends_on: F1 | parallelizable: no
- F3 `exterior-support` | satisfies: C17-C19 | depends_on: F1 | parallelizable: yes (with F4)
- F4 `client-import` | satisfies: C20-C21 | depends_on: F1 | parallelizable: yes (with F3)
- F5 `e2e-verification` | satisfies: C22-C24, C31 | depends_on: F2-F4 | parallelizable: no
- F6 `runbook` | satisfies: C28 | depends_on: F5 | parallelizable: no

## Decisions

- 2026-10-01: Canonical working copy = repo root `/home/mark/color-consultant-pro`
  (has .git, node_modules, local DB config). The nested zip extraction
  `color-consultant-pro-main/` is a redundant snapshot of `main`; it must not
  live inside the project root (pollutes tsconfig include → build failure).
- 2026-10-01: Integration branch strategy = new branch off `main`, apply the
  working-tree work on top, logical commits. Never rewrite history; leave
  `cleanup/phase-1-dependencies` untouched.
- 2026-10-01: User confirmed: no live deploy this pass; production target
  paint.weadtech.net; Synopsis Draft editor becomes the production synopsis
  path; work from repo docs (no external feedback list).

## Changelog

- Conjectured: the shipped zip would build as-is. Refuted-by: `npm run build` failed on
  `color-consultant-pro-main/app/api/admin/colors/[id]/route.ts` importing missing
  `@/lib/admin-auth`. Learned: `main` git has the file; the zip was a working-tree snapshot
  with an uncommitted deletion. Criterion-now: C1/C4 (build passes on release/finish with
  admin-auth restored from git).
- Conjectured: synopsis-draft was shippable as-is. Refuted-by: two review delegations found
  the DOCX embedded WebP bytes as "jpg" (broken photos in Word), a NOT NULL clientName
  500-loop, no Toaster mounted (toasts invisible), destructive unconfirmed reset. Learned:
  a feature can pass tsc and E2E smoke yet corrupt its core deliverable; the E2E specs
  created no photos/annotations so the seeder/exporter were untested. Criterion-now:
  C16 + the sharp-transcode verification (`file` reports "JPEG image data" in word/media).
- Conjectured: merge conflicts would be heavy across 22 files. Refuted-by: stash-pop onto
  main conflicted only in package.json/package-lock.json. Learned: the April work was
  additive relative to main's commits. Criterion-now: C3 (main is ancestor of release/finish).

## Verification

- C1 ✅ `npm run build` exit 0 (route manifest includes /synopsis-draft, /api/admin/*)
- C2 ✅ `npx tsc --noEmit` exit 0 (twice)
- C3 ✅ `git merge-base --is-ancestor main HEAD` → YES
- C4 ✅ `lib/admin-auth.ts` exists in working tree
- C5 ✅ `color-consultant-pro-main/` moved to /home/mark/color-consultant-pro-main-snapshot
- C6 ✅ `npx prisma migrate status` → "Database schema is up to date!" (favorites migration
  marked applied after verifying table shape matches migration SQL exactly)
- C7 ✅ `prisma/schema.prisma` has SynopsisDraft model; `npx prisma generate` exit 0
- C8 ✅ E2E editor load ⇒ GET 200 (server log: `GET /api/projects/.../synopsis-draft 200`)
- C9 ✅ E2E edit test ⇒ PUT 200 (server log), 22/22 spec suite green
- C10 ✅ E2E reset test ⇒ POST 200 + toast visible (after confirm-dialog handling)
- C11 ✅ E2E export test ⇒ GET 200 + download fires with .docx filename
- C12 ✅ `project-detail.tsx:193` links to `/dashboard/projects/${id}/synopsis-draft`
- C13 ✅ E2E asserts Client Information / Color Summary / Specifications visible
- C14 ✅ editor imports @dnd-kit/core + @dnd-kit/sortable (useSensors/PointerSensor)
- C15 ✅ E2E asserts "All changes saved" indicator; unsaved-indicator test passes
- C16 ✅ probe: document.xml contains "Corbin Smith", address, SW7541, Grecian Ivory,
  Duration/Matte, "Entry, Great Room", "SPECIFICATIONS" — all true
- C17 ✅ `grep -c "Siding - Lap/Clapboard" lib/types.ts` ≥ 1
- C18 ✅ ROOM_HIERARCHY includes "Exterior - Body" … "Exterior - Other"
- C19 ✅ probe: detectProductMismatch 8/8 expected results (interior-product-exterior-room,
  exterior-product-interior-room, 6 nulls)
- C20 ✅ `app/api/clients/import/route.ts` exists, validates size/type, blocks SSRF hosts
- C21 ✅ clients-list.tsx:12 imports and renders ImportClientsDialog
- C22 ✅ `npx playwright test tests/e2e/synopsis-draft.spec.ts` 22/22 in combined run
- C23 ✅ auth.spec.ts all passed in combined 22/22 run
- C24 ✅ projects.spec.ts all passed in combined 22/22 run
- C25 ✅ `grep -rn "TODO|FIXME|XXX|HACK"` app/components/lib/hooks → 0
- C26 ✅ .gitignore covers node_modules/.next/.env/logs/screenshots/.playwright-cli/scraps
- C27 ✅ release/finish: housekeeping, deps, exterior, client-import, synopsis-draft commits
- C28 ✅ DEPLOY_RUNBOOK.md at repo root with paint.weadtech.net steps + rollback
- C29 ✅ `git status --porcelain` empty after docs commit
- C30 ✅ legacy `/api/projects/[id]/synopsis/generate` route still exists (fallback kept)
- C31 ✅ dev server: `/` 200, `/auth/signin` 200 (curl)
- C32 ✅ real-secret grep on tracked files → 0 (5 hits were "openssl rand" placeholders)
- A1 ✅ final build output contains no color-consultant-pro-main error (dir removed)
- A2 ✅ no history rewrite beyond amending my own unpushed session commit (reflog intact)
- A3 ✅ tracked .env files are only .env.example and .env.test
- A4 ✅ `grep -c autoSaveAnnotatedPhoto photo-annotator.tsx` → 5 (feature intact)
