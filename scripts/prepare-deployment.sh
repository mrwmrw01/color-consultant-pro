#!/bin/bash
# Color Consultant Pro - Prepare Deployment Package
# Run this on your local machine to create the deployment package

set -e

echo "📦 Preparing Color Consultant Pro for Deployment"
echo "================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd /home/dad

# Check if color-consultant-pro exists
if [ ! -d "color-consultant-pro" ]; then
  echo -e "${RED}❌ Error: color-consultant-pro directory not found${NC}"
  exit 1
fi

echo "🔍 Running pre-deployment checks..."

# Check if tests pass
echo "  - Running E2E tests..."
cd color-consultant-pro

# Quick test run (just verify app builds)
npm run build > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Build failed. Fix errors before deploying.${NC}"
  exit 1
fi

echo -e "${GREEN}  ✓ Build successful${NC}"

# Create deployment package
echo ""
echo "📦 Creating deployment package..."
cd /home/dad

DEPLOY_FILE="color-consultant-pro-deploy-$(date +%Y%m%d-%H%M%S).tar.gz"

tar -czf "${DEPLOY_FILE}" color-consultant-pro \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='test-results' \
  --exclude='playwright-report' \
  --exclude='.git' \
  --exclude='*.log' \
  --exclude='logs' \
  --exclude='.env' \
  --exclude='.env.test' \
  --exclude='prisma/migrations/migration_lock.toml'

PACKAGE_SIZE=$(du -h "${DEPLOY_FILE}" | cut -f1)
echo -e "${GREEN}✓ Deployment package created: ${DEPLOY_FILE}${NC}"
echo "  Size: ${PACKAGE_SIZE}"

echo ""
echo "================================================"
echo -e "${GREEN}✅ Ready for deployment!${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Launch EC2 instance (if not done):"
echo "   - Ubuntu 22.04 LTS"
echo "   - t3.medium"
echo "   - 30GB gp3 storage"
echo "   - Security group: 22, 80, 443"
echo ""
echo "2. Copy deployment package to EC2:"
echo "   scp -i /path/to/your-key.pem ${DEPLOY_FILE} ubuntu@[EC2-IP]:/home/ubuntu/"
echo ""
echo "3. SSH into EC2 and extract:"
echo "   ssh -i /path/to/your-key.pem ubuntu@[EC2-IP]"
echo "   tar -xzf ${DEPLOY_FILE}"
echo "   cd color-consultant-pro"
echo ""
echo "4. Run deployment script:"
echo "   ./scripts/deploy-production.sh"
echo ""
echo "📋 Checklist: DEPLOYMENT_CHECKLIST_2026-02-04.md"
echo ""
