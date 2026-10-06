# Color Consultant Pro

Paint color consultation app for Color Guru: photograph a client's home, tag
each surface with its paint color, product line and sheen, and send the painter
a finished color synopsis as a Word document.

## Features

- Clients → properties → projects, with CSV/Excel client import
- Photo upload with automatic optimization (thumbnail, medium and large WebP)
- Color annotation on photos: color tags, pen and text tools, undo/redo,
  auto-save, and warnings when an interior product is tagged on an exterior
  surface (or the reverse)
- Full Sherwin-Williams and Benjamin Moore catalogs (5,634 colors), favorites,
  recent colors, custom colors, and catalog administration with CSV import
- Synopsis editor: a draft built from the annotations, grouped by color,
  product and sheen; drag-and-drop editing; DOCX export with photos for the
  painter
- Profile and password management, and a JSON export of all your data

## Tech stack

- Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS + shadcn/ui
- PostgreSQL with Prisma
- NextAuth (email and password)
- Photos on local disk or S3-compatible storage; sharp for image processing
- docx for the Word export
- Playwright end-to-end tests

## Local development

```bash
docker compose up -d                 # PostgreSQL on localhost:5432
cp .env.example .env                 # then set NEXTAUTH_SECRET
npm ci --legacy-peer-deps
npx prisma migrate deploy
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='choose-a-password' npm run db:seed
npm run dev                          # http://localhost:3000
```

`npm run db:seed` loads the color catalog and room list and creates your login.
A local database created before October 2026: run `npx prisma migrate deploy`
once; `prisma migrate dev` works again afterwards.

## Tests

```bash
npm run type-check
npm run build

# End-to-end: the tests sign in as test@colorguru.com and expect the app on port 3001
ADMIN_EMAIL=test@colorguru.com ADMIN_PASSWORD='TestPassword123!' npm run db:seed
NEXTAUTH_URL=http://localhost:3001 RATE_LIMIT_UPLOAD=10000 PORT=3001 npm run dev &
npx playwright test
```

The suite uploads far more photos than a person would, hence the higher upload
limit.

## Deployment

See [DEPLOY.md](./DEPLOY.md): a Render Blueprint (`render.yaml`), any Docker
host (`Dockerfile`), or the current Abacus host.

## License

Proprietary - All rights reserved
