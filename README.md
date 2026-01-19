# Color Consultant Pro

Professional paint color consultation and annotation platform with AI-powered suggestions.

## Features

✨ **Photo Management**
- Upload and organize project photos
- Automatic image optimization (70-85% size reduction)
- Three sizes generated: thumbnail, medium, large
- Fast gallery loading with thumbnails

🎨 **Color Annotation**
- Draw annotations on photos
- Tag colors with manufacturer details
- Product line and sheen selection
- Room-based organization

🤖 **AI-Powered Suggestions (Ralph Wiggum)**
- Intelligent color recommendations based on room type
- Considers existing colors in the space
- Uses Claude AI (Haiku model)
- Caches suggestions to minimize costs

💰 **Cost Optimizations**
- Image compression with Sharp (WebP format)
- S3 URL caching (90% request reduction)
- Rate limiting on all APIs
- Budget tracking for AI usage
- User tier system (free, pro, enterprise)

📊 **Professional Tools**
- Color synopsis generation
- Export to DOCX format
- Recent annotations copying
- Global room types

## Deployment to app.colorgurudesign.com

### Start Here

**📋 Step-by-step:** [`DEPLOY_APP_SUBDOMAIN.md`](./DEPLOY_APP_SUBDOMAIN.md) ← Use this!

**Setup:**
- **Main site:** colorgurudesign.com (stays on Wix - unchanged)
- **Color Consultant App:** app.colorgurudesign.com (AWS - new!)

Your existing Wix website remains completely intact!

### Prerequisites

- AWS account
- Domain: colorgurudesign.com (currently on Wix)
- S3 bucket for photo storage
- Anthropic API key from https://console.anthropic.com/

### Other Guides

- [`DEPLOY_COLORGURU.md`](./DEPLOY_COLORGURU.md) - Alternative deployment options
- [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) - Comprehensive AWS reference

### Deployment Scripts

```bash
scripts/deploy-to-ec2.sh        # Automated deployment
scripts/update-deployment.sh    # Update live app
scripts/backup.sh               # Backup database
```

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** PostgreSQL with Prisma ORM
- **Caching:** Redis with LRU cache
- **Storage:** AWS S3
- **AI:** Anthropic Claude (Haiku/Opus)
- **Image Processing:** Sharp
- **Authentication:** NextAuth.js
- **UI:** Tailwind CSS + shadcn/ui

## Local Development

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start PostgreSQL & Redis
docker-compose up -d

# Setup database
npx prisma generate
npx prisma db push

# Configure .env
cp .env.example .env
# Edit .env with your credentials

# Run dev server
npm run dev
# Open http://localhost:3000
```

## Cost Estimate

**Monthly AWS:** ~$40-50
- EC2 t3.medium: ~$30
- Storage: ~$3
- Data transfer: ~$5-10
- S3: ~$2-5

**Anthropic AI:**
- Free tier: $5/month budget
- ~$0.003 per suggestion
- ~1,600 suggestions on free tier

## Quick Commands

```bash
# SSH into server
ssh -i your-key.pem ubuntu@[ELASTIC-IP]

# Application
pm2 status                          # Check status
pm2 logs color-consultant-pro       # View logs
pm2 restart color-consultant-pro    # Restart

# Update deployment
cd /home/ubuntu/color-consultant-pro
./scripts/update-deployment.sh

# Backup
./scripts/backup.sh

# Database
docker ps                           # Check containers
docker logs color-consultant-db     # DB logs

# Web server
sudo systemctl restart nginx        # Restart Nginx
sudo certbot certificates           # Check SSL
```

## Performance Metrics

| Metric | Value |
|--------|-------|
| Photo upload size | 500KB-1MB (vs 5-10MB) |
| Gallery load | <2MB (vs ~50MB) |
| Thumbnail size | ~15KB each |
| URL cache hit rate | 90%+ |
| AI suggestion | <3s |
| Storage savings | 70-85% |

## Architecture

```
User Browser (HTTPS)
    ↓
Nginx Reverse Proxy
    ↓
Next.js App (PM2 Cluster)
    ↓
├─→ PostgreSQL (Docker)
├─→ Redis (Docker)
├─→ AWS S3
└─→ Anthropic Claude AI
```

## License

Proprietary - All rights reserved

---

**App URL:** https://app.colorgurudesign.com (Color Consultant Pro)

**Main Site:** https://colorgurudesign.com (Wix - unchanged)

**Documentation:** See deployment guides above

**Last Updated:** January 2026
