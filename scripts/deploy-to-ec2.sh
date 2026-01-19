#!/bin/bash
# Quick deployment script for Color Consultant Pro to AWS EC2

set -e

echo "🚀 Color Consultant Pro - AWS EC2 Deployment Script"
echo "=================================================="

# Check if running on EC2
if [ ! -f /etc/ec2-ami-id ]; then
  echo "⚠️  This script should be run on your EC2 instance"
  echo "Run: scp -r /home/dad/color-consultant-pro ubuntu@your-ec2-ip:/home/ubuntu/"
  exit 1
fi

# Prompt for configuration
read -p "Enter your domain [app.colorgurudesign.com]: " DOMAIN
DOMAIN=${DOMAIN:-app.colorgurudesign.com}
read -p "Enter PostgreSQL password: " -s POSTGRES_PASSWORD
echo
read -p "Enter Anthropic API key: " -s ANTHROPIC_API_KEY
echo
read -p "Enter AWS S3 bucket name: " S3_BUCKET
read -p "Enter AWS region [us-east-1]: " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}

echo ""
echo "📦 Step 1: Installing system dependencies..."
sudo apt update
sudo apt install -y nginx docker.io docker-compose

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

echo ""
echo "⚙️  Step 3: Creating .env file..."
NEXTAUTH_SECRET=$(openssl rand -base64 32)

cat > .env << EOF
DATABASE_URL="postgresql://colorapp:${POSTGRES_PASSWORD}@localhost:5432/color_consultant_db"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
NEXTAUTH_URL="https://${DOMAIN}"
AWS_BUCKET_NAME="${S3_BUCKET}"
AWS_FOLDER_PREFIX="color-consultant-prod/"
AWS_REGION="${AWS_REGION}"
REDIS_URL="redis://localhost:6379"
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}"
MONTHLY_COST_LIMIT=500
DAILY_COST_LIMIT=20
ENABLE_CIRCUIT_BREAKER=true
RATE_LIMIT_API=100
RATE_LIMIT_UPLOAD=20
RATE_LIMIT_SYNOPSIS=10
RATE_LIMIT_AI_SUGGESTIONS=30
RATE_LIMIT_PRESIGNED_URL=500
RATE_LIMIT_ANNOTATION=200
AI_BUDGET_FREE=5
AI_BUDGET_PRO=50
AI_BUDGET_ENTERPRISE=500
DEFAULT_USER_TIER="free"
IMAGE_QUALITY=85
MAX_IMAGE_DIMENSION=2048
ENABLE_IMAGE_COMPRESSION=true
GENERATE_THUMBNAILS=true
ENABLE_URL_CACHING=true
URL_CACHE_SIZE=2000
URL_CACHE_TTL=3000000
FEATURE_AI_SUGGESTIONS=true
FEATURE_COST_MONITORING=true
FEATURE_RATE_LIMITING=true
NODE_ENV="production"
LOG_LEVEL="info"
EOF

echo ""
echo "📚 Step 4: Installing Node.js dependencies..."
npm install --legacy-peer-deps

echo ""
echo "🗄️  Step 5: Setting up database..."
npx prisma generate
npx prisma db push

echo ""
echo "🔨 Step 6: Building application..."
npm run build

echo ""
echo "🌐 Step 7: Configuring Nginx..."
sudo tee /etc/nginx/sites-available/color-consultant > /dev/null << EOF
server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }

    client_max_body_size 50M;
}
EOF

sudo ln -sf /etc/nginx/sites-available/color-consultant /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

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

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Configure DNS to point ${DOMAIN} to this server's IP"
echo "2. Install SSL certificate:"
echo "   sudo certbot --nginx -d ${DOMAIN}"
echo "3. Visit https://${DOMAIN}"
echo ""
echo "Useful commands:"
echo "  pm2 status                  - Check app status"
echo "  pm2 logs                    - View logs"
echo "  pm2 restart color-consultant-pro  - Restart app"
echo "  docker ps                   - Check database/redis"
echo ""
