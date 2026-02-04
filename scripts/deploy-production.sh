#!/bin/bash
# Color Consultant Pro - Production Deployment Script
# Run this on the EC2 instance after uploading the code

set -e

echo "🚀 Color Consultant Pro - Production Deployment"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on EC2
if [ ! -f /etc/ec2-ami-id ]; then
  echo -e "${YELLOW}⚠️  Warning: This script is designed for EC2 instances${NC}"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Get configuration
read -p "Enter your domain [app.colorgurudesign.com]: " DOMAIN
DOMAIN=${DOMAIN:-app.colorgurudesign.com}

read -p "Enter PostgreSQL password: " -s POSTGRES_PASSWORD
echo

read -p "Enter Anthropic API key: " -s ANTHROPIC_API_KEY
echo

read -p "Enter AWS S3 bucket name [colorguru-photos]: " S3_BUCKET
S3_BUCKET=${S3_BUCKET:-colorguru-photos}

read -p "Enter AWS region [us-east-1]: " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}

echo ""
echo "📋 Configuration Summary:"
echo "  Domain: $DOMAIN"
echo "  S3 Bucket: $S3_BUCKET"
echo "  AWS Region: $AWS_REGION"
echo ""
read -p "Is this correct? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Deployment cancelled."
  exit 1
fi

echo ""
echo "📦 Step 1: Installing system dependencies..."
sudo apt update
sudo apt install -y nginx docker.io docker-compose

# Install Node.js 20 if not present
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" != "20" ]; then
  echo "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
  echo "Installing PM2..."
  sudo npm install -g pm2
fi

echo -e "${GREEN}✓ Dependencies installed${NC}"

echo ""
echo "🐳 Step 2: Starting PostgreSQL and Redis..."
cat > docker-compose.yml << EOF
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

docker-compose up -d
echo -e "${GREEN}✓ Database and Redis started${NC}"

echo ""
echo "⚙️  Step 3: Creating environment file..."
NEXTAUTH_SECRET=$(openssl rand -base64 32)

cat > .env << EOF
# Database
DATABASE_URL="postgresql://colorapp:${POSTGRES_PASSWORD}@localhost:5432/color_consultant_db"

# NextAuth
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
NEXTAUTH_URL="https://${DOMAIN}"

# AWS S3
AWS_BUCKET_NAME="${S3_BUCKET}"
AWS_FOLDER_PREFIX="color-consultant-prod/"
AWS_REGION="${AWS_REGION}"

# Redis
REDIS_URL="redis://localhost:6379"

# Anthropic AI
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}"

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

echo -e "${GREEN}✓ Environment file created${NC}"

echo ""
echo "📚 Step 4: Installing Node.js dependencies..."
npm install --legacy-peer-deps
echo -e "${GREEN}✓ Dependencies installed${NC}"

echo ""
echo "🗄️  Step 5: Setting up database..."
npx prisma generate
npx prisma migrate deploy
echo -e "${GREEN}✓ Database ready${NC}"

echo ""
echo "🔨 Step 6: Building application..."
npm run build
echo -e "${GREEN}✓ Build complete${NC}"

echo ""
echo "🌐 Step 7: Configuring Nginx..."
sudo tee /etc/nginx/sites-available/color-consultant > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

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
sudo nginx -t && sudo systemctl restart nginx
sudo systemctl enable nginx
echo -e "${GREEN}✓ Nginx configured${NC}"

echo ""
echo "🚀 Step 8: Starting application with PM2..."
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

mkdir -p /home/ubuntu/logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup | tail -1 | bash
echo -e "${GREEN}✓ Application started${NC}"

echo ""
echo "================================================"
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Configure DNS to point ${DOMAIN} to this server's IP"
echo "2. Install SSL certificate:"
echo "   sudo snap install --classic certbot"
echo "   sudo certbot --nginx -d ${DOMAIN}"
echo "3. Visit https://${DOMAIN}"
echo ""
echo "Useful commands:"
echo "  pm2 status                  - Check app status"
echo "  pm2 logs                    - View logs"
echo "  pm2 restart color-consultant-pro  - Restart app"
echo "  docker ps                   - Check database/redis"
echo ""
