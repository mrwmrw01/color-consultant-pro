#!/bin/bash
# Field Beta Deployment Script
# Usage: ./scripts/deploy-field-beta.sh
# Deploys the app to the production EC2 server

set -e

echo "=== Color Consultant Pro - Field Beta Deployment ==="
echo "Date: $(date)"
echo ""

# Configuration - update these values
EC2_USER="ubuntu"
EC2_HOST="52.207.126.255"  # Update with your Elastic IP
KEY_PEM="/home/dad/Downloads/color-consultant-key.pem"  # Update with your key path
APP_DIR="/home/ubuntu/color-consultant-pro"
DOMAIN="paint.weadtech.net"  # Update with your domain

echo "Step 1: Verify local build..."
NODE_ENV="production" npm run build
echo "✓ Build successful"

echo ""
echo "Step 2: Create deployment archive..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE_NAME="color-consultant-beta-${TIMESTAMP}.tar.gz"

tar -czf "/tmp/${ARCHIVE_NAME}" \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='test-results' \
  --exclude='playwright-report' \
  --exclude='.git' \
  --exclude='*.md' \
  --exclude='scripts/deploy-field-beta.sh' \
  .

echo "✓ Archive created: ${ARCHIVE_NAME}"

echo ""
echo "Step 3: Upload to server..."
scp -i "${KEY_PEM}" "/tmp/${ARCHIVE_NAME}" "${EC2_USER}@${EC2_HOST}:/tmp/${ARCHIVE_NAME}"
echo "✓ Upload complete"

echo ""
echo "Step 4: Deploy on server..."
ssh -i "${KEY_PEM}" "${EC2_USER}@${EC2_HOST}" << 'ENDSSH'
set -e

APP_DIR="/home/ubuntu/color-consultant-pro"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "  4a: Stopping app..."
pm2 stop color-consultant-pro 2>/dev/null || true

echo "  4b: Backing up current version..."
if [ -d "${APP_DIR}" ]; then
  cp -r "${APP_DIR}" "${APP_DIR}.backup.${TIMESTAMP}"
fi

echo "  4c: Extracting new version..."
mkdir -p "${APP_DIR}"
cd "${APP_DIR}"
tar -xzf "/tmp/${ARCHIVE_NAME}"

echo "  4d: Installing dependencies..."
npm install --legacy-peer-deps --production

echo "  4e: Generating Prisma client..."
npx prisma generate

echo "  4f: Running database migrations..."
npx prisma migrate deploy

echo "  4g: Building production bundle..."
NODE_ENV=production npm run build

echo "  4h: Restarting app..."
pm2 restart color-consultant-pro || pm2 start npm --name "color-consultant-pro" -- start

echo "  4i: Waiting for startup..."
sleep 5

echo "  4j: Checking health..."
curl -sf http://localhost:3000/api/health || echo "  ⚠ Health check pending - app may still be starting"

echo ""
echo "✓ Deployment complete!"
echo ""
echo "Next steps:"
echo "  1. Verify at: https://paint.weadtech.net"
echo "  2. Check health: https://paint.weadtech.net/api/health"
echo "  3. Test login with existing credentials"
echo "  4. Run field test checklist"
ENDSSH

echo ""
echo "Step 5: Cleanup..."
rm -f "/tmp/${ARCHIVE_NAME}"
echo "✓ Cleanup complete"

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Field Beta is now live at: https://${DOMAIN}"
echo "Health check: https://${DOMAIN}/api/health"
echo ""
echo "IMPORTANT: Public signup is DISABLED by default."
echo "To enable: set ALLOW_PUBLIC_SIGNUP=true in .env"
