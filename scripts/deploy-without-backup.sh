#!/bin/bash
# Deploy Color Consultant Pro to EC2 WITHOUT creating backup (for low disk situations)
# WARNING: Use deploy-updates-to-ec2.sh instead if you have enough disk space!

set -e

echo "🚀 Deploying Color Consultant Pro (No Backup Mode)"
echo "==================================================="
echo "⚠️  WARNING: No backup will be created due to disk constraints"
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

# Check disk space on server first
echo "📊 Checking server disk space..."
DISK_USAGE=$(ssh -i "$EC2_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=10 \
    ${EC2_USER}@${EC2_IP} "df / | tail -1 | awk '{print \$5}' | sed 's/%//'" 2>/dev/null || echo "100")

if [ "$DISK_USAGE" -ge 95 ]; then
    echo "⚠️  Server disk usage is at ${DISK_USAGE}%!"
    echo "🧹 Running emergency cleanup first..."
    ssh -i "$EC2_KEY" -o StrictHostKeyChecking=no ${EC2_USER}@${EC2_IP} << 'REMOTECLEANUP'
        # Emergency cleanup
        rm -rf /home/ubuntu/color-consultant-pro-backup-*
        rm -rf /home/ubuntu/ec2-backup-*
        npm cache clean --force 2>/dev/null || true
        rm -rf /tmp/color-consultant-update-*
        sudo apt-get clean 2>/dev/null || true
        pm2 flush 2>/dev/null || true
        echo "Cleanup complete"
REMOTECLEANUP
fi

echo "📦 Creating deployment package..."
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
echo "📤 Uploading to EC2..."
scp -i "$EC2_KEY" -o StrictHostKeyChecking=no \
  /tmp/color-consultant-update-${DEPLOY_TIMESTAMP}.tar.gz \
  ${EC2_USER}@${EC2_IP}:/tmp/

echo "✓ Upload complete"

echo ""
echo "🔧 Deploying on EC2..."
ssh -i "$EC2_KEY" -o StrictHostKeyChecking=no ${EC2_USER}@${EC2_IP} << ENDSSH

echo "  - Stopping application..."
cd ${PROJECT_PATH}
pm2 stop color-consultant-pro || true

echo "  - Extracting new code..."
cd ${PROJECT_PATH}
tar -xzf /tmp/color-consultant-update-${DEPLOY_TIMESTAMP}.tar.gz

echo "  - Restoring environment configuration..."
cp /home/ubuntu/.env ${PROJECT_PATH}/.env 2>/dev/null || true

echo "  - Installing dependencies..."
cd ${PROJECT_PATH}
npm install --legacy-peer-deps --silent

echo "  - Generating Prisma client..."
npx prisma generate

echo "  - Applying database migrations..."
npx prisma migrate deploy || echo "Migration may have already been applied"

echo "  - Building application..."
npm run build 2>&1 | tail -30

echo "  - Starting application..."
pm2 start ecosystem.config.js || pm2 restart ecosystem.config.js

echo "  - Cleaning up..."
rm /tmp/color-consultant-update-${DEPLOY_TIMESTAMP}.tar.gz

echo "  - Disk usage after deploy:"
df -h /

ENDSSH

rm /tmp/color-consultant-update-${DEPLOY_TIMESTAMP}.tar.gz

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Verification:"
echo "  Health check: curl https://app.colorgurudesign.com/api/health"
echo ""
echo "⚠️  IMPORTANT:"
echo "  - No backup was created due to disk constraints"
echo "  - Consider running ./scripts/emergency-disk-cleanup.sh if space is still low"
echo "  - Plan to upgrade EBS volume size soon"
