#!/bin/bash
# Deploy latest Color Consultant Pro updates to EC2
# This deploys the current local code with all fixes

set -e

echo "🚀 Deploying Color Consultant Pro Updates to EC2"
echo "================================================="
echo ""

EC2_IP="52.207.126.255"
EC2_USER="ubuntu"
EC2_KEY="/home/dad/Downloads/color-consultant-key.pem"
PROJECT_PATH="/home/ubuntu/color-consultant-pro"
DEPLOY_TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Check if SSH key exists
if [ ! -f "$EC2_KEY" ]; then
    echo "❌ Error: SSH key not found at $EC2_KEY"
    exit 1
fi

echo "📦 Step 1: Creating deployment package..."
cd /home/dad/color-consultant-pro
tar -czf /tmp/color-consultant-update-${DEPLOY_TIMESTAMP}.tar.gz \
  --exclude='./node_modules' \
  --exclude='./.next' \
  --exclude='./test-results' \
  --exclude='./playwright-report' \
  --exclude='./.git' \
  --exclude='./logs' \
  --exclude='./.env.test' \
  .

PACKAGE_SIZE=$(du -h /tmp/color-consultant-update-${DEPLOY_TIMESTAMP}.tar.gz | cut -f1)
echo "✓ Package created: ${PACKAGE_SIZE}"

echo ""
echo "📤 Step 2: Uploading to EC2..."
scp -i "$EC2_KEY" -o StrictHostKeyChecking=no \
  /tmp/color-consultant-update-${DEPLOY_TIMESTAMP}.tar.gz \
  ${EC2_USER}@${EC2_IP}:/tmp/

echo "✓ Upload complete"

echo ""
echo "🔧 Step 3: Deploying on EC2..."
ssh -i "$EC2_KEY" -o StrictHostKeyChecking=no ${EC2_USER}@${EC2_IP} << ENDSSH

echo "  - Stopping application..."
cd ${PROJECT_PATH}
pm2 stop color-consultant-pro || true

echo "  - Creating backup..."
cp -r ${PROJECT_PATH} ${PROJECT_PATH}-backup-${DEPLOY_TIMESTAMP} || true

echo "  - Extracting new code..."
cd ${PROJECT_PATH}
tar -xzf /tmp/color-consultant-update-${DEPLOY_TIMESTAMP}.tar.gz

# Restore .env file from backup
echo "  - Restoring environment configuration..."
cp ${PROJECT_PATH}-backup-${DEPLOY_TIMESTAMP}/.env ${PROJECT_PATH}/.env || true

echo "  - Installing dependencies..."
cd ${PROJECT_PATH}
npm install --legacy-peer-deps

echo "  - Generating Prisma client..."
npx prisma generate

echo "  - Applying database migrations..."
npx prisma migrate deploy || echo "Migration may have already been applied"

echo "  - Building application..."
npm run build

echo "  - Starting application..."
pm2 start ecosystem.config.js || pm2 restart ecosystem.config.js

echo "  - Cleaning up..."
rm /tmp/color-consultant-update-${DEPLOY_TIMESTAMP}.tar.gz

ENDSSH

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Deployment Summary:"
echo "  Timestamp: ${DEPLOY_TIMESTAMP}"
echo "  Server: app.colorgurudesign.com (${EC2_IP})"
echo "  Backup: ${PROJECT_PATH}-backup-${DEPLOY_TIMESTAMP}"
echo ""
echo "🔍 Verification:"
echo "  Health check: curl https://app.colorgurudesign.com/api/health"
echo ""
echo "📝 Recent Changes Deployed:"
echo "  ✓ Redis Circuit Breaker (fails closed for safety)"
echo "  ✓ S3 Configuration Validation"
echo "  ✓ Upload Transaction Safety (cleanup orphaned files)"
echo "  ✓ Database Performance Indexes"
echo ""
echo "🧪 To run tests on EC2:"
echo "  ssh -i ${EC2_KEY} ${EC2_USER}@${EC2_IP}"
echo "  cd ${PROJECT_PATH}"
echo "  npx playwright test"
echo ""

# Cleanup local temp file
rm -f /tmp/color-consultant-update-${DEPLOY_TIMESTAMP}.tar.gz
