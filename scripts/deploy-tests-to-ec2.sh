#!/bin/bash
# Deploy tests to EC2 Production
# Usage: ./scripts/deploy-tests-to-ec2.sh

set -e

echo "🚀 Deploying tests to EC2: app.colorgurudesign.com"
echo "=================================================="

EC2_IP="52.207.126.255"
EC2_USER="ubuntu"
EC2_KEY="/home/dad/Downloads/color-consultant-key.pem"
PROJECT_PATH="/home/ubuntu/color-consultant-pro"

# Check if SSH key exists
if [ ! -f "$EC2_KEY" ]; then
    echo "❌ Error: SSH key not found at $EC2_KEY"
    exit 1
fi

echo ""
echo "1️⃣  Pushing to GitHub..."
git push origin main

echo ""
echo "2️⃣  Deploying to EC2..."
ssh -i "$EC2_KEY" -o StrictHostKeyChecking=no ${EC2_USER}@${EC2_IP} << 'ENDSSH'
cd /home/ubuntu/color-consultant-pro

# Handle any conflicts
echo "🔧 Handling local changes..."
git stash save "Auto-stash before deployment $(date +%Y%m%d-%H%M%S)" 2>/dev/null || true

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

echo "✅ Tests deployed successfully!"
ENDSSH

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Deployment Info:"
echo "   Server: app.colorgurudesign.com (${EC2_IP})"
echo "   Path: ${PROJECT_PATH}"
echo "   Tests: 7 suites with 49 automated tests"
echo ""
echo "🧪 To run tests on EC2:"
echo "   ssh -i ${EC2_KEY} ${EC2_USER}@${EC2_IP}"
echo "   cd ${PROJECT_PATH}"
echo "   npx playwright test"
echo ""
echo "📝 Or run tests directly:"
echo "   ssh -i ${EC2_KEY} ${EC2_USER}@${EC2_IP} 'cd ${PROJECT_PATH} && npx playwright test'"
