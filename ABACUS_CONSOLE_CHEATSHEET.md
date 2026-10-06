# Abacus Console Cheat-Sheet — Find the Color Consultant Pro database

**Goal:** locate the production database for the app deployed at
paint.weadtech.net, then either export it or copy its `DATABASE_URL`.

**Account:** weadtech@outlook.com · Org: **WTI** · URL: https://apps.abacus.ai

---

## Path A — get the DATABASE_URL (fastest)

1. Open https://apps.abacus.ai and sign in (weadtech@outlook.com).
2. In the left nav open **ChatLLM / Agent** (the app was built as an Abacus AI
   Agent App).
3. Click **Manage Apps** (your browser history shows you used
   `apps.abacus.ai/chatllm/manage_apps` on Oct 2).
4. Find the app whose custom domain is **paint.weadtech.net**
   ("Color Consultant Pro").
5. Open its **Settings / Environment / Secrets** tab.
6. Copy the value of **`DATABASE_URL`** (a `postgresql://…` string) — that is all
   I need to dump the entire production database.
7. Also note the storage settings shown there (`AWS_BUCKET_NAME`, any S3 keys)
   for the record.

If a `DATABASE_URL` is NOT listed there, the app may use Abacus's hosted
database — in that case look for a **Database** section in the app's settings
(or in the left nav: **Database**), and use its **Export/Backup** button to
download a dump.

## Path B — export via the app itself (no console needed)

If you'd rather not dig through the console, just give me your
**paint.weadtech.net login** (email + password). I will run:

```bash
PROD_EMAIL=<your-email> PROD_PASSWORD=<your-password> \
  npx tsx scripts/export-prod-data.ts
```

That pulls every client, property, project, photo record, annotation and
synopsis through the app's own API into `/home/mark/recovery/prod-export/`.
(The script is already verified working against a live NextAuth deployment.)

Then ingestion into the rebuilt app is one more command:

```bash
INGEST_USER_EMAIL=<your-email> npx tsx --require dotenv/config \
  scripts/ingest-prod-export.ts /home/mark/recovery/prod-export/<export-folder>
```

## Path C — can't remember the app login?

The app has no password-reset flow, so use Path A: in the console, find the
app's database settings and either export it or reset the user's password in
the DB directly. I can generate a bcrypt hash for any new password if needed.

---

## What happens after I have the data

1. Merge prod data with the local restore (Wead + Michelle + 5,640-color
   catalog) — `scripts/ingest-prod-export.ts` + the DB dumps in
   `/home/mark/recovery/db/`.
2. Re-upload the recovered photos (7 from DOCX + 18 originals, review gallery
   at `/home/mark/recovery/gallery/index.html`).
3. Redeploy `main` to paint.weadtech.net with `STORAGE_DRIVER=local` or an R2
   bucket (see `ABACUS_DEPLOY.md`).
