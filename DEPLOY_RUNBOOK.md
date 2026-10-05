# Deploy Runbook — Color Consultant Pro → paint.weadtech.net

**Date:** 2026-10-01
**Branch to ship:** `release/finish` (built on `main` = Field Beta v0.1 + all April–October work)
**Status of this branch:** build ✅ · type-check ✅ · migrations ✅ · E2E (auth/projects/synopsis) ✅

---

## 0. What this release contains

- **Synopsis Draft editor (NEW production synopsis tool)** — `/dashboard/projects/[projectId]/synopsis-draft`
  - Curated drag-and-drop groups, inline editing, confirmed Reset, auto-save
  - DOCX v2 export matching the hand-crafted painter format (client name, summary table,
    color-group tables, embedded photos transcode WebP→JPEG so they open correctly in Word)
  - New table: `synopsis_drafts` (migration `20260418000000_add_synopsis_draft`)
- **Exterior paint support** — exterior surface types, exterior room hierarchy, product-line
  interior/exterior mismatch warnings with override
- **Client import** — CSV/XLSX import dialog on the Clients page (`/api/clients/import`)
- **Fixes** — see the 7 commits on `release/finish` (`git log main..release/finish --oneline`)

---

## 1. Pre-flight (on your machine)

```bash
cd color-consultant-pro
git fetch origin
git checkout release/finish
git merge-base --is-ancestor main release/finish && echo "main is an ancestor ✓"

npm ci --legacy-peer-deps          # clean install
npx prisma generate
npm run build                       # must exit 0
npx playwright test tests/e2e/auth.spec.ts tests/e2e/projects.spec.ts tests/e2e/synopsis-draft.spec.ts
```

> Photo-upload/annotation E2E specs require real AWS S3 credentials and will fail locally with
> dummy creds — that is expected.

---

## 2. Backup the production database FIRST

On the database host (PostgreSQL for `color_consultant_db`):

```bash
pg_dump "$DATABASE_URL" -Fc -f color_consultant_db_$(date +%Y%m%d_%H%M).dump
```

Or via the repo script (when Postgres runs in Docker on the app host):

```bash
./scripts/backup.sh
```

---

## 3. Deploy the code

paint.weadtech.net is served behind the Abacus AI CDN; deploy the origin exactly the way
Field Beta v0.1 was deployed (git pull + rebuild + restart, or the Abacus dashboard Deploy
button). The repo's helper scripts assume an EC2 host with PM2:

### Storage driver (NEW — the app no longer requires AWS)

Since the AWS account (and the `colorguru-photos` S3 bucket) no longer exists, the app now
has a pluggable storage layer (`lib/storage.ts`):

- `STORAGE_DRIVER=local` — photos stored on the app server's disk under `LOCAL_UPLOADS_DIR`,
  served via `/api/files?key=...`. Zero cloud dependencies. Use this if the app runs on a
  server you control.
- `STORAGE_DRIVER=s3` — AWS S3 (default), or any S3-compatible provider by setting
  `S3_ENDPOINT_URL` (+ `S3_FORCE_PATH_STYLE=true`) — works with Cloudflare R2, Backblaze B2,
  MinIO. Recommended for cloud hosting: create an R2 bucket (~free tier), set
  `AWS_BUCKET_NAME=<bucket>`, `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` = R2 keys,
  `AWS_REGION=auto`, `S3_ENDPOINT_URL=https://<accountid>.r2.cloudflarestorage.com`.

Old photo rows still point at the deleted S3 bucket; re-upload photos after switching drivers
(the recovered photos are in `/home/mark/recovery/photos/` and `recovery/originals/`).

### Path A — git pull on the app host (EC2 / PM2)

```bash
ssh <user>@<app-host>
cd /path/to/color-consultant-pro

git fetch origin
git checkout release/finish        # or: git pull after merging to main
npm ci --legacy-peer-deps
npx prisma generate

# DATABASE MIGRATION (new synopsis_drafts table) — do this before restart
npx prisma migrate deploy

NODE_ENV=production npm run build
pm2 restart color-consultant-pro   # or your process manager equivalent
```

### Path B — if the origin is managed by the hosting platform

Upload the repository (or its build artifacts) via the same mechanism used for v0.1, then run
on the server: `npm ci --legacy-peer-deps && npx prisma generate && npx prisma migrate deploy
&& NODE_ENV=production npm run build && <restart>`.

### Environment reminders (production `.env`)

- `ALLOW_PUBLIC_SIGNUP=false` (signup gate — keep closed unless onboarding new users)
- `FEATURE_AI_SUGGESTIONS=false`
- `AWS_BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` must be valid — DOCX export
  reads photos from S3, so real credentials are required for photo embedding
- `REDIS_URL` — rate limiter requires Redis

---

## 4. Verify after deploy

```bash
curl -s https://paint.weadtech.net/api/health          # expect JSON with database/redis/s3 checks
curl -s -o /dev/null -w "%{http_code}" https://paint.weadtech.net/auth/signin   # 200
```

Then in the browser:
1. Sign in → dashboard loads
2. Open a project → **Edit Synopsis** → editor loads with Client Information / Color Summary /
   Specifications
3. Edit the client name → "Saved" toast; click **Export DOCX** → download opens in Word with
   the client name, color tables, and working photos
4. Annotate a photo with an exterior room + interior product line → amber mismatch warning shows
5. Clients page → **Import Clients** → upload a CSV/XLSX → rows appear

---

## 5. Rollback

```bash
# code
git checkout main && NODE_ENV=production npm run build && pm2 restart color-consultant-pro
# database: the synopsis_drafts table is additive — no destructive rollback needed
```

---

## 6. Known limitations (Phase 2 candidates)

- Synopsis editor: photos attach via a filename picker (no thumbnails/sidebar drag yet)
- Group layout (1/2/3 columns) is fixed by the seeder; the editor can reorder but not restructure
- Legacy synopsis generator is still reachable as fallback ("View Synopsis"); remove after
  the new editor is validated in the field (plan step 12)
- AI color suggestions remain disabled
- S3 photo fetch in DOCX export uses the original (un-annotated) photo, matching the
  hand-crafted reference documents
