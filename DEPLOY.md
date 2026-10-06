# Deploying Color Consultant Pro

This is the current deployment guide. It replaces the AWS, EC2 and Abacus
runbooks elsewhere in the repo.

**Production today:** paint.weadtech.net on Abacus. To upgrade it, follow
[Option C](#option-c---stay-on-abacus-current-host-of-paintweadtechnet).

**Verified 2026-10-06:** the production image (`Dockerfile`) starts against an
empty database, migrates and seeds itself, and passes the full end-to-end suite
(64 tests) with no Redis and photos on a volume.

## What the app needs

| | |
|---|---|
| Runtime | The Docker image built from `Dockerfile`, or Node 20 running `npm ci && npm run build && npm start` |
| Database | PostgreSQL 14 or newer |
| Photo storage | A persistent volume mounted at `/data` (default), or an S3-compatible bucket |
| Redis | Optional. Without it, rate limits are kept in memory, which is correct for one app instance |

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | `postgresql://user:password@host:5432/db` |
| `NEXTAUTH_SECRET` | yes | Long random string: `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | yes* | `true` behind a proxy that sets the Host header (Render, Fly, Railway, nginx). *Or set `NEXTAUTH_URL` to the site's one URL |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | first deploy | Creates the first login if no user has that email. Public sign-up is off, so this is how a new site gets an account. Has no effect afterwards; change the password in the app (Profile) after the first sign-in |
| `ALLOW_PUBLIC_SIGNUP` | no | Keep `false` |
| `STORAGE_DRIVER` | no | `local` in the Docker image (photos under `LOCAL_UPLOADS_DIR`, default `/data/uploads`). `s3` for an S3-compatible bucket, see below |
| `REDIS_URL` | no | Share rate limits through Redis |
| `RATE_LIMIT_UPLOAD`, `RATE_LIMIT_PRESIGNED_URL` | no | Per-user hourly limits; defaults 60 and 5000 |

### What happens on every start (`npm start`)

1. `scripts/db-migrate.mjs` applies migrations. An empty database is built
   from scratch; a database created with `prisma db push` (tables but no
   migration history) is synced and baselined; the app does not start if the
   schema cannot be brought up to date.
2. `scripts/seed.ts` adds anything missing: the paint manufacturers, the full
   Sherwin-Williams and Benjamin Moore catalog (5,634 colors), the room list,
   and the admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Existing rows are left alone.
3. Next.js starts on `$PORT`. `/api/health` reports database, storage and
   rate-limiter status.

## Option A - Render

`render.yaml` describes the whole setup: the app, a 10 GB photo disk and a
PostgreSQL 16 database. Render deploys again on every push to the connected
branch.

1. Sign in at <https://dashboard.render.com> with GitHub and give Render access
   to `mrwmrw01/color-consultant-pro`.
2. **New → Blueprint**, pick the repository and the branch to deploy (`main`
   once this work is merged).
3. When asked, enter `ADMIN_EMAIL` and `ADMIN_PASSWORD` for your login, then
   **Apply**. The first build and deploy take about 5-10 minutes.
4. Open the `https://color-consultant-pro-….onrender.com` address Render shows
   and sign in.
5. Custom domain: in the service, **Settings → Custom Domains → Add**
   `paint.weadtech.net`. Then at GoDaddy (DNS for weadtech.net) change the
   `paint` CNAME record from `sites.abacusai-cdn.net` to the `….onrender.com`
   host Render displays. Render issues the HTTPS certificate automatically once
   DNS has switched (usually minutes, up to a few hours).

Cost: Starter instance $7/month, disk $2.50/month (10 GB), database
basic-256mb about $6/month; about $16/month in total. Render snapshots disks
daily, and paid database plans include automated backups.

## Option B - any Docker host (VPS, Fly.io, Railway, …)

```bash
docker build -t color-consultant-pro .
docker run -d --name color-consultant-pro -p 3000:3000 \
  -e DATABASE_URL="postgresql://…" \
  -e NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
  -e AUTH_TRUST_HOST=true \
  -e ADMIN_EMAIL="you@example.com" -e ADMIN_PASSWORD="…" \
  -v color-consultant-data:/data \
  color-consultant-pro
```

Put HTTPS in front (Caddy, nginx + certbot, or the platform's load balancer)
and keep `/data` on persistent storage. The container runs the app as the
unprivileged `node` user; the entrypoint makes the volume writable for it.

## Option C - stay on Abacus (current host of paint.weadtech.net)

Abacus does not deploy from GitHub: the app lives in its DeepAgent workspace
(apps.abacus.ai, see `ABACUS_CONSOLE_CHEATSHEET.md`). The upgrade runs there
against the same database, so every existing client, property, project and
annotation carries over.

### 1. Photo storage

Photos used to live in the deleted `colorguru-photos` S3 bucket, and Abacus may
not keep files between deploys, so use a Cloudflare R2 bucket (free up to
10 GB):

1. <https://dash.cloudflare.com> → **R2** → **Create bucket**, for example
   `color-consultant-photos`.
2. The bucket's **Settings → CORS policy**:
   ```json
   [
     {
       "AllowedOrigins": ["https://paint.weadtech.net"],
       "AllowedMethods": ["GET"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
   The annotator draws the photo onto a canvas to save the annotated copy,
   which browsers only allow for CORS-enabled images.
3. **R2 → Manage API tokens → Create API token**, permission **Object Read &
   Write**, limited to that bucket. Note the access key ID, the secret access
   key and the S3 endpoint `https://<account-id>.r2.cloudflarestorage.com`.
4. In the Abacus app's **Settings → Environment / Secrets**, add:
   ```
   STORAGE_DRIVER=s3
   AWS_BUCKET_NAME=color-consultant-photos
   AWS_ACCESS_KEY_ID=<access key id>
   AWS_SECRET_ACCESS_KEY=<secret access key>
   AWS_REGION=auto
   S3_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
   NEXTAUTH_URL=https://paint.weadtech.net
   ALLOW_PUBLIC_SIGNUP=false
   ```
   Keep the existing `DATABASE_URL` and `NEXTAUTH_SECRET`.

### 2. Upgrade through DeepAgent

Merge the pull request into `main`, open the Color Consultant Pro app in
DeepAgent and send it this message:

```text
Update this app to the latest code from
https://github.com/mrwmrw01/color-consultant-pro (branch main) and redeploy it
to paint.weadtech.net. Keep the existing database and all of its data: never
reset it, never run `prisma migrate reset` or `prisma db push --accept-data-loss`.

1. Back up the database first:
   pg_dump "$DATABASE_URL" -Fc -f color_consultant_backup_<today>.dump
   and give me the file to download.
2. Replace the app's code with the repository's main branch. Keep the existing
   environment variables and secrets, including the new storage settings.
3. Install dependencies: npm ci --legacy-peer-deps
4. Bring the database schema up to date: node scripts/db-migrate.mjs
   It applies pending migrations without deleting data. If it reports that the
   schema sync was refused, stop and show me its full output.
5. Add any missing paint colors and rooms: npm run db:seed
   (it does not change existing records).
6. Build with npm run build and deploy to the custom domain paint.weadtech.net.
   If the deployment has a start command, use npm start (it repeats steps 4
   and 5 on every start).
   If Prisma reports a missing query engine for the deployment platform, add
   the target named in the error to binaryTargets in prisma/schema.prisma and
   build again.
7. Open https://paint.weadtech.net/api/health and show me the output. It
   should report "status":"ok".
```

### 3. After the upgrade

- Old photos still point at the deleted S3 bucket and show as broken images.
  Their annotations (colors, rooms, products, sheens) are intact and still feed
  the synopsis. Re-upload the recovered photos to their projects with
  **Upload Photos**. Do not delete the old photo records: deleting a photo
  deletes its annotations.
- Rollback: redeploy the previous version from Abacus. The backup from step 1
  restores with `pg_restore` if it is ever needed.

## Moving the data to a new host (options A and B)

Staying on Abacus needs none of this. To move to Render or another host, the
existing clients, properties and projects come across through the old site's
API:

1. Export with your login:
   `PROD_EMAIL=… PROD_PASSWORD=… OUT_DIR=./prod-export npx tsx scripts/export-prod-data.ts`
2. Load it into the new database:
   `DATABASE_URL=<new database> INGEST_USER_EMAIL=<your login> npx tsx scripts/ingest-prod-export.ts ./prod-export/<folder>`

   On Render, allow your IP under the database's **Networking → Access
   Control** for the import, use the **External Database URL**, then remove the
   rule again.
3. Re-upload photos through the app (Upload Photos on each project).

## After deploying

```bash
curl -s https://paint.weadtech.net/api/health
# {"status":"ok","checks":{"database":{"status":"ok"},"storage":{"status":"ok",…},"rateLimit":{"status":"ok",…}}}
```

Then sign in, change the admin password (Profile), and walk through one job:
client → property → project → upload a photo → annotate a color → Edit Synopsis
→ Export DOCX.

## Rollback

- Abacus: redeploy the previous version from the app's deployments.
- Render: **Events → Rollback** to the previous deploy.
- Docker: run the previous image tag.
- No database rollback is needed: the migrations bring the database to the
  schema in `prisma/schema.prisma`, which earlier releases already expect.

## Known limitations

- The Synopsis Studio page (`/dashboard/projects/<id>/synopsis/studio`, not
  linked in the app) exports PDF through the `weasyprint` command, which the
  Docker image leaves out (~500 MB). The Edit Synopsis editor's DOCX export is
  the production path.
- AI color suggestions are disabled.
