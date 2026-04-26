# Color Consultant Pro - Field Beta Deployment Guide

## What Changed in This Release

- ✅ Production build now passes cleanly (Next.js 14.2.35)
- ✅ Added missing npm scripts: `test`, `test:e2e`, `type-check`, `lint:fix`
- ✅ Created missing Prisma migration for UserFavoriteColor
- ✅ Upgraded vulnerable dependencies (58 → 21 vulnerabilities)
- ✅ Added `ALLOW_PUBLIC_SIGNUP` flag (disabled by default for beta)
- ✅ ESLint configured (no more interactive prompts)
- ✅ Field test checklist and deployment script added

## Pre-Deployment Checklist

### AWS Infrastructure
- [ ] EC2 instance running (t3.medium minimum)
- [ ] Elastic IP assigned and DNS pointing to `paint.weadtech.net`
- [ ] SSL certificate valid (Let's Encrypt via Certbot)
- [ ] S3 bucket exists and accessible (`colorguru-photos` or your bucket)
- [ ] IAM role attached to EC2 with S3 access

### Environment Variables (.env on server)
```bash
# Database
DATABASE_URL="postgresql://colorapp:PASSWORD@localhost:5432/color_consultant_db"

# NextAuth
NEXTAUTH_SECRET="<generate with: openssl rand -base64 32>"
NEXTAUTH_URL="https://paint.weadtech.net"

# AWS S3
AWS_BUCKET_NAME="your-bucket-name"
AWS_FOLDER_PREFIX="color-consultant-prod/"
AWS_REGION="us-east-1"

# Redis
REDIS_URL="redis://localhost:6379"

# Anthropic AI (optional for beta - can disable)
ANTHROPIC_API_KEY="sk-ant-your-key"

# Feature Flags
FEATURE_AI_SUGGESTIONS=false
FEATURE_COST_MONITORING=false
FEATURE_RATE_LIMITING=true

# Access Control
ALLOW_PUBLIC_SIGNUP=false

# Rate Limiting
RATE_LIMIT_API=100
RATE_LIMIT_UPLOAD=20
RATE_LIMIT_SYNOPSIS=10
RATE_LIMIT_AI_SUGGESTIONS=30
RATE_LIMIT_PRESIGNED_URL=500
RATE_LIMIT_ANNOTATION=200

# Production
NODE_ENV="production"
LOG_LEVEL="info"
```

### Database
- [ ] PostgreSQL running in Docker or directly
- [ ] Redis running
- [ ] Run migration: `npx prisma migrate deploy`
- [ ] Seed test user if needed: `npm run db:seed`

## Deployment Steps

### Option A: Automated (recommended)
```bash
# From the repo root
chmod +x scripts/deploy-field-beta.sh
./scripts/deploy-field-beta.sh
```

### Option B: Manual
```bash
# 1. SSH to server
ssh -i your-key.pem ubuntu@YOUR-ELASTIC-IP

# 2. Navigate to app
cd /home/ubuntu/color-consultant-pro

# 3. Pull latest code
git pull origin main

# 4. Install dependencies
npm install --legacy-peer-deps

# 5. Run migrations
npx prisma migrate deploy

# 6. Build
NODE_ENV=production npm run build

# 7. Restart
pm2 restart color-consultant-pro

# 8. Verify
curl https://paint.weadtech.net/api/health
```

## Post-Deployment Verification

### 1. Health Check
```bash
curl -s https://paint.weadtech.net/api/health | python3 -m json.tool
```
Expected response:
```json
{
  "status": "ok",
  "timestamp": "...",
  "checks": {
    "database": { "status": "ok" },
    "s3": { "status": "ok" },
    "redis": { "status": "ok" }
  }
}
```

### 2. Login Test
- Open https://paint.weadtech.net/auth/signin
- Sign in with existing credentials
- Verify dashboard loads

### 3. Signup Test (should be blocked)
- Open https://paint.weadtech.net/auth/signup
- Attempt to create account
- Should see: "Public signup is currently disabled"

### 4. Upload Test
- Create test client → property → project
- Upload 1 photo
- Verify photo appears in project

### 5. Annotation Test
- Open uploaded photo for annotation
- Add 1 color tag annotation
- Refresh page - annotation should persist

## Rollback Plan

If deployment fails:
```bash
# SSH to server
ssh -i your-key.pem ubuntu@YOUR-ELASTIC-IP

# Stop current app
pm2 stop color-consultant-pro

# Restore backup (find latest)
cd /home/ubuntu
ls -la color-consultant-pro.backup.*

# Copy backup back
rm -rf color-consultant-pro
cp -r color-consultant-pro.backup.YYYYMMDD_HHMMSS color-consultant-pro
cd color-consultant-pro

# Rebuild and restart
NODE_ENV=production npm run build
pm2 restart color-consultant-pro
```

## Field Beta Rules

1. **Only 1-2 real consultations** during Beta 1
2. **Fix only blockers**: login failure, upload failure, lost annotations, export failure
3. **No new features** until Beta 1 feedback is collected
4. **Client uses checklist** - not open-ended exploration
5. **Feedback form** must be completed after each field test

## Known Limitations (Phase 2+)

- AI color suggestions disabled
- PDF export styling is basic
- Admin color import is rough
- No offline mode
- No real-time collaboration
- Color catalog may have gaps

## Support Contacts

- Developer: [Your contact]
- Server access: [AWS credentials location]
- Database backup: `./scripts/backup.sh`
