# Color Consultant Pro - production image
#
# `npm start` applies database migrations, seeds reference data (color
# catalog, rooms, and the first admin from ADMIN_EMAIL / ADMIN_PASSWORD), then
# starts Next.js on $PORT. Photos are stored on the /data volume.
#
# Required at runtime: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL.
# See DEPLOY.md.

FROM node:20-bookworm-slim AS base
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS build
COPY package.json package-lock.json ./
# postinstall runs `prisma generate`, which needs the schema
COPY prisma ./prisma
RUN npm ci --legacy-peer-deps --no-audit --no-fund
COPY . .
# The build cache and SWC compiler are only needed to build, not to run
RUN npm run build \
 && npm prune --omit=dev --legacy-peer-deps --no-audit --no-fund \
 && rm -rf .next/cache node_modules/@next/swc-*

FROM base AS runner
# tini forwards stop signals to the app. (The unlinked Synopsis Studio's PDF
# export shells out to weasyprint, which is not installed: ~500 MB.)
RUN apt-get update \
 && apt-get install -y --no-install-recommends tini \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    PORT=3000 \
    STORAGE_DRIVER=local \
    LOCAL_UPLOADS_DIR=/data/uploads
COPY --from=build --chown=node:node /app ./
RUN mkdir -p /data/uploads && chown -R node:node /data
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
ENTRYPOINT ["tini", "--", "/app/scripts/docker-entrypoint.sh"]
CMD ["npm", "start"]
