#!/bin/bash
# Update/Redeploy Color Consultant Pro
# Run this on your EC2 instance after initial deployment

set -e

echo "🔄 Updating Color Consultant Pro..."
echo "===================================="

cd /home/ubuntu/color-consultant-pro

echo ""
echo "1️⃣  Pulling latest code..."
if [ -d .git ]; then
  git pull origin main
else
  echo "⚠️  Not a git repository. Skipping git pull."
  echo "   Upload new code manually with: scp -r /home/dad/color-consultant-pro ubuntu@your-ec2-ip:/home/ubuntu/"
fi

echo ""
echo "2️⃣  Installing dependencies..."
npm install --legacy-peer-deps

echo ""
echo "3️⃣  Running database migrations..."
npx prisma generate
npx prisma db push

echo ""
echo "4️⃣  Building application..."
npm run build

echo ""
echo "5️⃣  Reloading PM2 (zero downtime)..."
pm2 reload color-consultant-pro

echo ""
echo "✅ Update complete!"
echo ""
echo "Check status:"
echo "  pm2 status"
echo "  pm2 logs color-consultant-pro"
echo ""
