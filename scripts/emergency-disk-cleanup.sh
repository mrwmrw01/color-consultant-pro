#!/bin/bash
# Emergency Disk Cleanup Script for Color Consultant Pro
# Run this when disk space is critically low

set -e

echo "🧹 Emergency Disk Cleanup"
echo "=========================="
echo ""

# Show current disk usage
echo "📊 Current disk usage:"
df -h /
echo ""

# 1. Clean npm cache
echo "🗑️  Cleaning npm cache..."
npm cache clean --force 2>/dev/null || true
echo "   ✓ NPM cache cleaned"
echo ""

# 2. Remove old PM2 logs
echo "🗑️  Cleaning PM2 logs..."
rm -rf /home/ubuntu/.pm2/logs/*
pm2 flush 2>/dev/null || true
echo "   ✓ PM2 logs cleaned"
echo ""

# 3. Clean old backups (keep only last 2)
echo "🗑️  Cleaning old backups..."
cd /home/ubuntu
ls -t | grep "color-consultant-pro-backup-" | tail -n +3 | xargs -r rm -rf
ls -t | grep "ec2-backup-" | tail -n +3 | xargs -r rm -rf
echo "   ✓ Old backups removed (kept last 2)"
echo ""

# 4. Clean temp files
echo "🗑️  Cleaning temp files..."
rm -rf /tmp/color-consultant-update-*
rm -rf /tmp/npm-*
rm -rf /tmp/hsperfdata_*
echo "   ✓ Temp files cleaned"
echo ""

# 5. Clean apt cache
echo "🗑️  Cleaning apt cache..."
sudo apt-get clean 2>/dev/null || true
sudo apt-get autoclean 2>/dev/null || true
echo "   ✓ Apt cache cleaned"
echo ""

# 6. Remove old log files
echo "🗑️  Cleaning old system logs..."
sudo find /var/log -type f -name "*.log.*" -mtime +3 -delete 2>/dev/null || true
sudo find /var/log -type f -name "*.gz" -mtime +3 -delete 2>/dev/null || true
echo "   ✓ Old logs cleaned"
echo ""

# 7. Clean Next.js build cache if it's large
echo "🗑️  Checking Next.js build cache..."
NEXT_CACHE_SIZE=$(du -sm /home/ubuntu/color-consultant-pro/.next 2>/dev/null | cut -f1)
if [ "$NEXT_CACHE_SIZE" -gt 200 ]; then
    echo "   Next.js cache is ${NEXT_CACHE_SIZE}MB, cleaning..."
    rm -rf /home/ubuntu/color-consultant-pro/.next/cache/*
    echo "   ✓ Next.js cache cleaned"
else
    echo "   Next.js cache is ${NEXT_CACHE_SIZE}MB (OK)"
fi
echo ""

# Show disk usage after cleanup
echo "📊 Disk usage after cleanup:"
df -h /
echo ""

# Calculate freed space
FREE_AFTER=$(df -m / | tail -1 | awk '{print $4}')
echo "✅ Cleanup complete! Available space: ${FREE_AFTER}MB"
echo ""
echo "If disk space is still low, consider:"
echo "  1. Manually removing older backups in /home/ubuntu/"
echo "  2. Clearing Docker images: docker system prune -a"
echo "  3. Upgrading EBS volume size in AWS console"
