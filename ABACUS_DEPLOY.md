# Abacus Deploy Checklist — Color Consultant Pro → paint.weadtech.net

**Version to ship:** `main` @ `12793eb` (tag `v1.0.0` + storage refactor + data restore)
**Current production:** older build (no `/synopsis-draft` route, pre-storage-refactor)
**Date:** 2026-10-05

---

## 0. How production is hosted (verified)

- `paint.weadtech.net` → CNAME `sites.abacusai-cdn.net` (Abacus AI "Sites" platform,
  fronted by Cloudflare + Envoy). DNS is managed at GoDaddy (weadtech.net).
- The app runs as an **Abacus AI Agent App** inside the **WTI** org
  (account: weadtech@outlook.com). It is NOT deployed from GitHub — the repo has no
  deploy webhooks, and the GitHub Actions CI runner is offline (runs stay "queued").
- The old AWS EC2 (52.207.126.255) is dead/repurposed; the `colorguru-photos` S3
  bucket no longer exists. **Do not point production at AWS.**

---

## 1. Decide the storage backend (do this first)

The app now supports two drivers (`STORAGE_DRIVER`):

| Driver | Use when | Notes |
|---|---|---|
| `s3` + R2/B2/MinIO endpoint | **Recommended for Abacus hosting** | Abacus app filesystems may be ephemeral — object storage is durable. |
| `local` | Self-hosted server with persistent disk | Simplest; files under `LOCAL_UPLOADS_DIR`, served via `/api/files`. |

### Option A — Cloudflare R2 (recommended, ~free tier)

1. Create an R2 bucket (e.g. `colorguru-photos`) at dash.cloudflare.com → R2.
2. Create an R2 API token with Object Read & Write for that bucket.
3. Set these env vars in the Abacus app's environment:

```
STORAGE_DRIVER=s3
AWS_BUCKET_NAME=colorguru-photos
AWS_ACCESS_KEY_ID=<R2 access key id>
AWS_SECRET_ACCESS_KEY=<R2 secret>
AWS_REGION=auto
S3_ENDPOINT_URL=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

(Backblaze B2 or MinIO work the same way — just swap the endpoint.)

### Option B — local disk

```
STORAGE_DRIVER=local
LOCAL_UPLOADS_DIR=./storage/uploads
```

---

## 2. The database

The app's `start` script now runs `prisma migrate deploy && next start`, so **any
deploy automatically applies pending migrations** (adds `synopsis_drafts`).

Two paths, in order of preference:

### Path A — production DB still reachable (RECOMMENDED)

1. In the Abacus app's environment, find `DATABASE_URL`.
2. Back it up FIRST (from wherever it lives):
   `pg_dump "$DATABASE_URL" -Fc -f color_consultant_db_prod_$(date +%Y%m%d).dump`
3. Deploy (step 3 below) — the start script applies the migration.
4. After deploy: export the DB dump to your machine and hand it to the recovery
   folder (`/home/mark/recovery/db/`) so we can reconcile prod data with the
   locally restored Wead/Michelle projects.

### Path B — production DB unreachable (rebuild from local dump)

1. Use the local dump: `/home/mark/recovery/db/color_consultant_db-local5434-*.dump`
   (contains the full 5,640-color catalog + Wead project + Michelle rebuild).
2. Load it into whatever Postgres the Abacus app uses (their managed DB or a new
   one), then set `DATABASE_URL` accordingly.
3. Re-upload photos (see step 4).

---

## 3. Deploy

1. Log in to apps.abacus.ai (weadtech@outlook.com, org WTI).
2. Open the **Color Consultant Pro** app workspace.
3. Get the new code in: either pull `main` from
   `github.com/mrwmrw01/color-consultant-pro` into the app's files, or upload the
   repo zip (build it locally with
   `git archive -o /tmp/color-consultant-v1.zip main`).
4. Run: `npm ci --legacy-peer-deps && npm run build` (postinstall runs
   `prisma generate` automatically).
5. Click **Deploy** → **Custom Domain** → select `paint.weadtech.net` → **Deploy**.
   (Abacus docs: https://abacus.ai/help/chatllm-ai-super-assistant/deepagent-apps-deployment)
6. Wait for the deploy to go live (~5 min).

---

## 4. Re-upload recovered photos (only needed if starting fresh)

On the deployed app (or before deploy, against the target DB):

```bash
npx tsx --require dotenv/config scripts/restore-recovered-data.ts
```

Recovered photos: `/home/mark/recovery/photos/` (7 client photos) and
`/home/mark/recovery/originals/` (18 phone originals — review them first).

---

## 5. Verify after deploy

```bash
curl -s https://paint.weadtech.net/api/health   # expect database+storage+redis ok
curl -s -o /dev/null -w "%{http_code}" https://paint.weadtech.net/auth/signin  # 200
```

In the browser:
1. Sign in → dashboard
2. Open a project → **Edit Synopsis** (route now exists → 200)
3. Edit + Save → toast confirms; **Export DOCX** → opens in Word with photos
4. Upload a new photo → appears in the project (proves the storage driver works)
5. Clients page → **Import Clients** works

---

## 6. Rollback

- Code: redeploy the previous app version from the Abacus dashboard (previous
  deployment is kept), or `git checkout` the previous commit inside the app env.
- DB: the synopsis_drafts migration is additive — no rollback needed.
- Storage: photos written to the new driver stay valid; old S3 keys were already dead.

---

## 7. Still open (needs user access)

- Production database export from the Abacus account (Path A step 4).
- Reviewing the 18 phone originals for re-upload.
- Optionally re-registering a self-hosted GitHub Actions runner so CI runs again.
