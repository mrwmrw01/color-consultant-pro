# AWS Deployment Guide - Color Consultant Pro

Deploy to custom subdomain (e.g., `color-consultant.yourdomain.com`)

---

## Prerequisites

- AWS Account
- Domain name (managed in Route 53 or external registrar)
- S3 bucket for photo storage (already have this)
- SSH key pair for EC2

---

## Step 1: Launch EC2 Instance

### Create EC2 Instance
```bash
# Recommended: Ubuntu 22.04 LTS
# Instance Type: t3.medium or larger (2 vCPU, 4GB RAM minimum)
# Storage: 30GB gp3
# Security Group: Allow ports 22, 80, 443
```

### Security Group Rules
```
Inbound Rules:
- SSH (22) - Your IP only
- HTTP (80) - 0.0.0.0/0
- HTTPS (443) - 0.0.0.0/0
- PostgreSQL (5432) - Same VPC only (if using RDS)
- Redis (6379) - Same VPC only (if using ElastiCache)
```

---

## Step 2: Connect and Setup Server

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x (required for this app)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v20.x
npm --version

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx (reverse proxy)
sudo apt install -y nginx

# Install Docker and Docker Compose (for PostgreSQL and Redis)
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker ubuntu
newgrp docker

# Install build tools
sudo apt install -y build-essential python3
```

---

## Step 3: Setup PostgreSQL and Redis

### Option A: Docker Containers (Recommended for Development/Small Scale)

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    container_name: color-consultant-db
    restart: always
    environment:
      POSTGRES_USER: colorapp
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: color_consultant_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    container_name: color-consultant-redis
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    networks:
      - app-network

volumes:
  postgres_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

Start services:
```bash
# Set PostgreSQL password
export POSTGRES_PASSWORD="your-secure-password-here"

# Start containers
docker-compose up -d

# Verify running
docker ps
```

### Option B: AWS Managed Services (Production)

**PostgreSQL - RDS:**
```bash
# Create RDS PostgreSQL instance
# - Engine: PostgreSQL 14
# - Instance: db.t3.micro (or larger)
# - Storage: 20GB gp3
# - VPC: Same as EC2
# - Security Group: Allow 5432 from EC2 security group
# - Database name: color_consultant_db
```

**Redis - ElastiCache:**
```bash
# Create ElastiCache Redis cluster
# - Engine: Redis 7.x
# - Node: cache.t3.micro (or larger)
# - VPC: Same as EC2
# - Security Group: Allow 6379 from EC2 security group
```

---

## Step 4: Clone and Setup Application

```bash
# Clone your repository (or use scp to upload)
cd /home/ubuntu
git clone https://github.com/yourusername/color-consultant-pro.git
# OR
# scp -r /home/dad/color-consultant-pro ubuntu@your-ec2-ip:/home/ubuntu/

cd color-consultant-pro

# Install dependencies
npm install --legacy-peer-deps

# Create .env file
nano .env
```

### Production .env Configuration

```bash
# Database (Docker local)
DATABASE_URL="postgresql://colorapp:your-secure-password@localhost:5432/color_consultant_db"

# OR Database (RDS)
# DATABASE_URL="postgresql://colorapp:password@your-rds-endpoint:5432/color_consultant_db"

# NextAuth
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="https://color-consultant.yourdomain.com"

# AWS S3 (Use IAM role instead of keys - see below)
AWS_BUCKET_NAME="your-existing-bucket-name"
AWS_FOLDER_PREFIX="color-consultant-prod/"
AWS_REGION="us-east-1"

# Redis (Docker local)
REDIS_URL="redis://localhost:6379"

# OR Redis (ElastiCache)
# REDIS_URL="redis://your-elasticache-endpoint:6379"

# Anthropic AI
ANTHROPIC_API_KEY="sk-ant-your-api-key-here"

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

# Environment
NODE_ENV="production"
LOG_LEVEL="info"
```

---

## Step 5: Setup IAM Role for S3 Access (Recommended)

Instead of AWS keys in .env, use IAM role:

```bash
# 1. Create IAM role for EC2 with S3 access
# IAM Console > Roles > Create Role
# - Trusted entity: AWS service > EC2
# - Permissions: AmazonS3FullAccess (or custom policy)
# - Name: ColorConsultantEC2Role

# 2. Attach role to EC2 instance
# EC2 Console > Instance > Actions > Security > Modify IAM role
# - Select: ColorConsultantEC2Role

# 3. Remove AWS keys from .env (app will use IAM role automatically)
# Remove these lines:
# AWS_ACCESS_KEY_ID
# AWS_SECRET_ACCESS_KEY
```

---

## Step 6: Build and Run Application

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma db push

# Build Next.js application
npm run build

# Test the build
NODE_ENV=production npm start
# Visit http://your-ec2-ip:3000 to verify

# Stop the test (Ctrl+C)
```

---

## Step 7: Setup PM2 Process Manager

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
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

# Create logs directory
mkdir -p /home/ubuntu/logs

# Start application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command it outputs (starts with sudo)

# Check status
pm2 status
pm2 logs color-consultant-pro

# Useful PM2 commands:
# pm2 restart color-consultant-pro  # Restart app
# pm2 stop color-consultant-pro     # Stop app
# pm2 reload color-consultant-pro   # Zero-downtime reload
# pm2 monit                         # Monitor CPU/Memory
```

---

## Step 8: Configure Nginx Reverse Proxy

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/color-consultant
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name color-consultant.yourdomain.com;

    # Redirect HTTP to HTTPS (will be enabled after SSL setup)
    # return 301 https://$server_name$request_uri;

    # Temporarily serve app over HTTP for testing
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

        # Increase timeouts for file uploads
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }

    # Increase upload size for photos
    client_max_body_size 50M;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/color-consultant /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable Nginx on boot
sudo systemctl enable nginx
```

---

## Step 9: Configure DNS (Route 53 or External)

### Option A: Route 53 (AWS DNS)

```bash
# 1. Go to Route 53 Console
# 2. Select your hosted zone (yourdomain.com)
# 3. Create Record:
#    - Record name: color-consultant
#    - Record type: A
#    - Value: Your EC2 Elastic IP
#    - TTL: 300
#    - Routing policy: Simple

# OR if using ALB (load balancer):
#    - Record type: A
#    - Alias: Yes
#    - Alias target: Your ALB DNS name
```

### Option B: External DNS Provider (Cloudflare, Namecheap, etc.)

Add DNS record at your provider:
```
Type: A
Name: color-consultant
Value: Your EC2 Elastic IP
TTL: Auto or 300
```

**Important:** Allocate an Elastic IP for your EC2 instance:
```bash
# AWS Console > EC2 > Elastic IPs > Allocate
# Then associate it with your instance
# This ensures your IP doesn't change on instance restart
```

---

## Step 10: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Get SSL certificate
sudo certbot --nginx -d color-consultant.yourdomain.com

# Follow prompts:
# - Enter email address
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (option 2)

# Certbot will automatically:
# 1. Get SSL certificate
# 2. Update Nginx config
# 3. Setup auto-renewal

# Test auto-renewal
sudo certbot renew --dry-run

# Check certificate
sudo certbot certificates
```

After SSL setup, your Nginx config will be automatically updated to:
```nginx
server {
    listen 80;
    server_name color-consultant.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name color-consultant.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/color-consultant.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/color-consultant.yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

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

    client_max_body_size 50M;
}
```

---

## Step 11: Seed Color Database (Important!)

```bash
cd /home/ubuntu/color-consultant-pro

# If you have seed files, run:
# npx prisma db seed

# OR manually import color data
# You'll need to populate the Colors and ColorAvailability tables
# with Sherwin Williams and Benjamin Moore catalogs
```

---

## Step 12: Create First User

Since user data was cleared, create your first admin user:

```bash
# Option 1: Via database (if using credentials auth)
docker exec -it color-consultant-db psql -U colorapp -d color_consultant_db

INSERT INTO users (id, email, "firstName", "lastName", role, tier, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'your-email@example.com',
  'Your',
  'Name',
  'consultant',
  'enterprise',
  NOW(),
  NOW()
);

\q

# Option 2: Sign up through the app (if using OAuth)
# Just visit https://color-consultant.yourdomain.com and sign up
```

---

## Step 13: Verify Deployment

Visit: `https://color-consultant.yourdomain.com`

**Checklist:**
- ✅ HTTPS working (green padlock)
- ✅ Can sign in / sign up
- ✅ Can create project
- ✅ Can upload photos (check S3 bucket)
- ✅ Photos display correctly (thumbnails loading)
- ✅ Can annotate photos
- ✅ AI suggestions button works
- ✅ Color catalog loaded

**Check logs:**
```bash
# Application logs
pm2 logs color-consultant-pro

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Docker logs (if using)
docker logs color-consultant-db
docker logs color-consultant-redis
```

---

## Monitoring and Maintenance

### Health Checks

```bash
# Create health check script
cat > /home/ubuntu/health-check.sh << 'EOF'
#!/bin/bash
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ $response != "200" ]; then
  echo "App is down! Status: $response"
  pm2 restart color-consultant-pro
  # Optional: send alert
fi
EOF

chmod +x /home/ubuntu/health-check.sh

# Add to crontab (check every 5 minutes)
crontab -e
# Add line:
# */5 * * * * /home/ubuntu/health-check.sh >> /home/ubuntu/logs/health-check.log 2>&1
```

### Backup Script

```bash
cat > /home/ubuntu/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR

# Backup database
docker exec color-consultant-db pg_dump -U colorapp color_consultant_db | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Backup .env
cp /home/ubuntu/color-consultant-pro/.env $BACKUP_DIR/env_backup_$DATE

# Upload to S3 (optional)
# aws s3 cp $BACKUP_DIR/db_backup_$DATE.sql.gz s3://your-backup-bucket/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /home/ubuntu/backup.sh

# Run daily at 2 AM
crontab -e
# Add line:
# 0 2 * * * /home/ubuntu/backup.sh >> /home/ubuntu/logs/backup.log 2>&1
```

### Update Deployment Script

```bash
cat > /home/ubuntu/update-app.sh << 'EOF'
#!/bin/bash
cd /home/ubuntu/color-consultant-pro

# Pull latest code
git pull origin main

# Install dependencies
npm install --legacy-peer-deps

# Run migrations
npx prisma generate
npx prisma db push

# Build application
npm run build

# Reload PM2 (zero downtime)
pm2 reload color-consultant-pro

echo "Deployment updated successfully"
EOF

chmod +x /home/ubuntu/update-app.sh

# Usage:
# ./update-app.sh
```

---

## Troubleshooting

### App won't start
```bash
# Check PM2 logs
pm2 logs color-consultant-pro --lines 100

# Check if port 3000 is available
sudo netstat -tlnp | grep 3000

# Restart app
pm2 restart color-consultant-pro
```

### Database connection issues
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
docker exec -it color-consultant-db psql -U colorapp -d color_consultant_db -c "SELECT 1;"

# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

### Redis connection issues
```bash
# Check Redis is running
docker ps | grep redis

# Test connection
docker exec -it color-consultant-redis redis-cli ping
# Should return: PONG

# Check REDIS_URL in .env
cat .env | grep REDIS_URL
```

### S3/Image upload issues
```bash
# Check IAM role is attached to EC2
aws sts get-caller-identity

# Test S3 access
aws s3 ls s3://your-bucket-name/

# Check .env S3 settings
cat .env | grep AWS_
```

### Nginx issues
```bash
# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Check logs
sudo tail -f /var/log/nginx/error.log
```

### Out of memory
```bash
# Check memory usage
free -h
pm2 monit

# If needed, add swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Cost Optimization

### EC2 Reserved Instance
After confirming everything works, consider:
- Reserved Instance (1-year): ~40% savings
- Savings Plan: ~20-30% savings

### RDS/ElastiCache
- Use db.t3/cache.t3 instances for dev/staging
- Reserved instances for production
- Stop RDS instances during off-hours (dev only)

### S3
- Use S3 Lifecycle policies to move old photos to Glacier
- Enable S3 Intelligent-Tiering

---

## Security Checklist

- ✅ EC2 security group restricts SSH to your IP only
- ✅ Database password is strong (20+ characters)
- ✅ NEXTAUTH_SECRET is securely generated
- ✅ Anthropic API key is kept secure
- ✅ IAM role used instead of AWS keys
- ✅ SSL certificate installed
- ✅ Regular backups configured
- ✅ PM2 process monitoring active
- ✅ Firewall configured (ufw)
- ✅ Fail2ban installed (optional)

---

## Performance Tuning

### PM2 Cluster Mode
Already configured in ecosystem.config.js - runs multiple instances

### Nginx Caching (Optional)
```nginx
# Add to /etc/nginx/sites-available/color-consultant
# Inside server block:

location /_next/static/ {
    proxy_pass http://localhost:3000;
    proxy_cache_valid 200 365d;
    add_header Cache-Control "public, immutable";
}

location /api/photos/ {
    proxy_pass http://localhost:3000;
    # No caching for API routes
}
```

### Database Connection Pooling
Already handled by Prisma. For high traffic, consider PgBouncer.

---

## Next Steps

1. **Monitor performance** with PM2 and CloudWatch
2. **Set up CloudWatch alarms** for CPU, memory, disk usage
3. **Configure CloudFront** (CDN) for faster photo delivery
4. **Set up automated backups** to S3
5. **Configure Auto Scaling** if traffic grows
6. **Add Application Load Balancer** for high availability

---

## Support

If you encounter issues:
1. Check logs: `pm2 logs color-consultant-pro`
2. Check Nginx: `sudo tail -f /var/log/nginx/error.log`
3. Check database: `docker logs color-consultant-db`
4. Verify DNS: `dig color-consultant.yourdomain.com`
5. Test SSL: `curl -I https://color-consultant.yourdomain.com`

