# Color Consultant Pro - MVP Deployment Checklist

**Date:** February 4, 2026  
**Version:** MVP Ready  
**Status:** Pre-Deployment

---

## ✅ Pre-Deployment Checklist

### 1. AWS Prerequisites

| Item | Required | Status | Notes |
|------|----------|--------|-------|
| AWS Account | ✅ | Verify | https://console.aws.amazon.com |
| EC2 t3.medium instance | ✅ | Ready | Ubuntu 22.04 LTS |
| Elastic IP | ✅ | Ready | Static IP for DNS |
| S3 Bucket | ✅ | Ready | `colorguru-photos` (us-east-1) |
| IAM Role for EC2 | ✅ | Ready | `ColorConsultantEC2Role` with S3FullAccess |

### 2. Domain & DNS

| Item | Required | Status | Notes |
|------|----------|--------|-------|
| Domain `colorgurudesign.com` | ✅ | Active | On Wix |
| Subdomain `app.colorgurudesign.com` | ✅ | DNS A Record | Point to Elastic IP |
| SSL Certificate | ✅ | Let's Encrypt | Auto via Certbot |

### 3. API Keys & Secrets

| Item | Required | Status | Source |
|------|----------|--------|--------|
| Anthropic API Key | ✅ | Ready | https://console.anthropic.com |
| NEXTAUTH_SECRET | ✅ | Generate | `openssl rand -base64 32` |
| PostgreSQL Password | ✅ | Create | Strong password |

### 4. Code Verification

| Check | Status | Notes |
|-------|--------|-------|
| All 49 E2E tests passing | ✅ | Verified |
| Circuit breaker implemented | ✅ | `lib/rate-limiter.ts` |
| S3 validation added | ✅ | `lib/aws-config.ts` |
| Upload cleanup added | ✅ | `app/api/photos/upload/route.ts` |
| DB indexes applied | ✅ | 16 indexes total |

---

## 🚀 Deployment Steps

### Phase 1: AWS Setup (10 minutes)

#### 1.1 Launch EC2 Instance
```
Name: color-consultant-prod
AMI: Ubuntu Server 22.04 LTS
Instance type: t3.medium
Key pair: Select or create
Storage: 30 GB gp3

Security Group:
- SSH (22): My IP
- HTTP (80): 0.0.0.0/0
- HTTPS (443): 0.0.0.0/0
```

#### 1.2 Allocate Elastic IP
```bash
# In AWS Console: EC2 > Elastic IPs > Allocate
# Associate with your instance
# Write down the IP: ___.___.___.___
```

#### 1.3 Create IAM Role
```
IAM Console > Roles > Create role
- Trusted entity: AWS service > EC2
- Permission: AmazonS3FullAccess
- Name: ColorConsultantEC2Role
- Attach to EC2 instance
```

---

### Phase 2: DNS Configuration (5 minutes)

#### 2.1 Wix DNS Setup
```
Wix Dashboard > Settings > Domains > colorgurudesign.com
Advanced DNS:
- Type: A
- Host: app
- Points to: [Your Elastic IP]
- TTL: 1 Hour
```

#### 2.2 Verify DNS
```bash
# Wait 5-10 minutes, then verify:
dig app.colorgurudesign.com
# Should return your Elastic IP
```

---

### Phase 3: Server Preparation (5 minutes)

#### 3.1 SSH into Server
```bash
ssh -i /path/to/your-key.pem ubuntu@[YOUR-ELASTIC-IP]
```

#### 3.2 Install Dependencies
```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx docker.io docker-compose

# Install PM2
sudo npm install -g pm2

# Verify
node --version  # Should show v20.x
```

---

### Phase 4: Code Deployment (10 minutes)

#### 4.1 Upload Code (from local machine)
```bash
cd /home/dad
tar -czf color-consultant-pro-deploy.tar.gz color-consultant-pro \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='test-results' \
  --exclude='playwright-report' \
  --exclude='.git'

scp -i /path/to/your-key.pem color-consultant-pro-deploy.tar.gz \
  ubuntu@[YOUR-ELASTIC-IP]:/home/ubuntu/
```

#### 4.2 Extract on Server
```bash
ssh -i /path/to/your-key.pem ubuntu@[YOUR-ELASTIC-IP]
cd /home/ubuntu
tar -xzf color-consultant-pro-deploy.tar.gz
cd color-consultant-pro
```

---

### Phase 5: Configuration (10 minutes)

#### 5.1 Create Environment File
```bash
cd /home/ubuntu/color-consultant-pro

# Generate secrets
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Create .env file
cat > .env << EOF
# Database
DATABASE_URL="postgresql://colorapp:[YOUR_DB_PASSWORD]@localhost:5432/color_consultant_db"

# NextAuth
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
NEXTAUTH_URL="https://app.colorgurudesign.com"

# AWS S3
AWS_BUCKET_NAME="colorguru-photos"
AWS_FOLDER_PREFIX="color-consultant-prod/"
AWS_REGION="us-east-1"

# Redis
REDIS_URL="redis://localhost:6379"

# Anthropic AI
ANTHROPIC_API_KEY="[YOUR_ANTHROPIC_API_KEY]"

# Cost Controls
MONTHLY_COST_LIMIT=500
DAILY_COST_LIMIT=20
ENABLE_CIRCUIT_BREAKER=true

# Rate Limiting
RATE_LIMIT_API=100
RATE_LIMIT_UPLOAD=20
RATE_LIMIT_SYNOPSIS=10
RATE_LIMIT_AI_SUGGESTIONS=30
RATE_LIMIT_PRESIGNED_URL=500
RATE_LIMIT_ANNOTATION=200

# User Tiers
AI_BUDGET_FREE=5
AI_BUDGET_PRO=50
AI_BUDGET_ENTERPRISE=500
DEFAULT_USER_TIER="free"

# Image Optimization
IMAGE_QUALITY=85
MAX_IMAGE_DIMENSION=2048
ENABLE_IMAGE_COMPRESSION=true
GENERATE_THUMBNAILS=true

# S3 URL Caching
ENABLE_URL_CACHING=true
URL_CACHE_SIZE=2000
URL_CACHE_TTL=3000000

# Feature Flags
FEATURE_AI_SUGGESTIONS=true
FEATURE_COST_MONITORING=true
FEATURE_RATE_LIMITING=true

# Production
NODE_ENV="production"
LOG_LEVEL="info"
EOF
```

#### 5.2 Setup Docker Services
```bash
# Create docker-compose.yml
cat > docker-compose.yml << EOF
version: '3.8'
services:
  postgres:
    image: postgres:14-alpine
    container_name: color-consultant-db
    restart: always
    environment:
      POSTGRES_USER: colorapp
      POSTGRES_PASSWORD: [YOUR_DB_PASSWORD]
      POSTGRES_DB: color_consultant_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
  redis:
    image: redis:7-alpine
    container_name: color-consultant-redis
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
volumes:
  postgres_data:
  redis_data:
EOF

# Start services
docker-compose up -d
```

---

### Phase 6: Application Setup (10 minutes)

#### 6.1 Install Dependencies & Build
```bash
cd /home/ubuntu/color-consultant-pro

# Install dependencies
npm install --legacy-peer-deps

# Generate Prisma client
npx prisma generate

# Apply database migrations
npx prisma migrate deploy

# Build application
npm run build
```

#### 6.2 Configure Nginx
```bash
sudo tee /etc/nginx/sites-available/color-consultant > /dev/null << 'EOF'
server {
    listen 80;
    server_name app.colorgurudesign.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/color-consultant /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

### Phase 7: SSL Certificate (5 minutes)

```bash
# Install Certbot
sudo snap install --classic certbot

# Get SSL certificate
sudo certbot --nginx -d app.colorgurudesign.com

# Follow prompts:
# - Email: [your-email]
# - Terms: Y
# - Share email: N
# - Redirect HTTP to HTTPS: 2 (Yes)
```

---

### Phase 8: Start Application (5 minutes)

#### 8.1 Create PM2 Config
```bash
cat > /home/ubuntu/color-consultant-pro/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'color-consultant-pro',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/ubuntu/logs/color-consultant-error.log',
    out_file: '/home/ubuntu/logs/color-consultant-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
}
EOF

mkdir -p /home/ubuntu/logs
```

#### 8.2 Start with PM2
```bash
cd /home/ubuntu/color-consultant-pro
pm2 start ecosystem.config.js
pm2 save
pm2 startup | tail -1 | bash
```

---

### Phase 9: Verification (10 minutes)

#### 9.1 Health Check
```bash
# Test health endpoint
curl https://app.colorgurudesign.com/api/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2026-02-04T...",
  "checks": {
    "database": { "status": "ok" },
    "s3": { "status": "ok", "bucket": "colorguru-photos" },
    "redis": { "status": "ok", "circuitOpen": false }
  }
}
```

#### 9.2 Smoke Tests
| Test | Command/URL | Expected |
|------|-------------|----------|
| App loads | https://app.colorgurudesign.com | Login page |
| SSL valid | Check browser padlock | Green/Secure |
| Sign up | Create test account | Success |
| Create project | Dashboard > New Project | Project created |
| Upload photo | Project > Upload | Photo appears |
| AI suggestions | Annotate > Get AI Suggestions | Ralph responds |

---

### Phase 10: Post-Deployment (5 minutes)

#### 10.1 Setup Automated Backups
```bash
# Create backup script
crontab -e

# Add line:
0 2 * * * /home/ubuntu/color-consultant-pro/scripts/backup.sh >> /home/ubuntu/logs/backup.log 2>&1
```

#### 10.2 Verify Monitoring
```bash
# Check PM2 status
pm2 status
pm2 logs color-consultant-pro --lines 20

# Check Docker containers
docker ps

# Check disk space
df -h
```

---

## 📊 Post-Deployment Checklist

### Functional Verification
- [ ] App loads at https://app.colorgurudesign.com
- [ ] SSL certificate valid (green padlock)
- [ ] Sign up works
- [ ] Login works
- [ ] Create project works
- [ ] Upload photo works
- [ ] Annotate photo works
- [ ] AI suggestions work
- [ ] Color synopsis generates

### Performance Verification
- [ ] Page loads < 3 seconds
- [ ] Photo upload < 10 seconds
- [ ] Gallery loads < 2 seconds
- [ ] AI response < 5 seconds

### Cost Monitoring
- [ ] AWS Cost Explorer shows expected ~$40-50/month
- [ ] Anthropic usage tracked in Redis
- [ ] Rate limiting working (check logs)

---

## 🔧 Quick Reference Commands

```bash
# SSH into server
ssh -i /path/to/key.pem ubuntu@[ELASTIC-IP]

# View logs
pm2 logs color-consultant-pro
pm2 logs color-consultant-pro --lines 100

# Restart app
pm2 restart color-consultant-pro

# Update deployment
cd /home/ubuntu/color-consultant-pro
./scripts/update-deployment.sh

# Database backup
./scripts/backup.sh

# Check health
curl https://app.colorgurudesign.com/api/health | jq

# Check rate limits
curl https://app.colorgurudesign.com/api/ai/suggestions | jq

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

---

## 🚨 Troubleshooting

### App Won't Start
```bash
pm2 logs color-consultant-pro --lines 50
docker logs color-consultant-db
docker logs color-consultant-redis
```

### Photos Won't Upload
```bash
# Check S3 IAM role
aws sts get-caller-identity

# Test S3 access
aws s3 ls s3://colorguru-photos/
```

### Database Connection Issues
```bash
docker restart color-consultant-db
npx prisma migrate deploy
```

### Redis Down (Circuit Breaker Open)
```bash
docker restart color-consultant-redis
pm2 restart color-consultant-pro
```

---

## 📞 Support Resources

- **Deployment Guide:** `DEPLOYMENT_GUIDE.md`
- **Architecture:** `ARCHITECTURE.md`
- **Cost Optimization:** `COST_OPTIMIZATION_SUMMARY.md`

---

**Ready to Deploy?** 

✅ All 49 tests passing  
✅ All 4 critical issues fixed  
✅ Checklist complete  

**Estimated deployment time:** 60 minutes
