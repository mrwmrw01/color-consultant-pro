#!/bin/bash
# Backup Color Consultant Pro database and environment
# Run this on your EC2 instance

set -e

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
APP_DIR="/home/ubuntu/color-consultant-pro"

echo "💾 Creating backup..."
echo "===================="

# Create backup directory
mkdir -p $BACKUP_DIR

echo ""
echo "1️⃣  Backing up database..."
docker exec color-consultant-db pg_dump -U colorapp color_consultant_db | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz
echo "   Saved to: $BACKUP_DIR/db_backup_$DATE.sql.gz"

echo ""
echo "2️⃣  Backing up .env file..."
cp $APP_DIR/.env $BACKUP_DIR/env_backup_$DATE
echo "   Saved to: $BACKUP_DIR/env_backup_$DATE"

echo ""
echo "3️⃣  Creating archive of backups..."
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz -C $BACKUP_DIR db_backup_$DATE.sql.gz env_backup_$DATE
echo "   Created: $BACKUP_DIR/backup_$DATE.tar.gz"

# Optional: Upload to S3 (uncomment if you want this)
# echo ""
# echo "4️⃣  Uploading to S3..."
# aws s3 cp $BACKUP_DIR/backup_$DATE.tar.gz s3://your-backup-bucket/color-consultant/

echo ""
echo "5️⃣  Cleaning old backups (keeping last 7 days)..."
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete
find $BACKUP_DIR -name "env_backup_*" -mtime +7 -delete
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete

echo ""
echo "✅ Backup complete!"
echo ""
echo "Backup location: $BACKUP_DIR/backup_$DATE.tar.gz"
echo ""
echo "To restore:"
echo "  gunzip < $BACKUP_DIR/db_backup_$DATE.sql.gz | docker exec -i color-consultant-db psql -U colorapp -d color_consultant_db"
echo ""
