#!/bin/bash
# Disk Space Monitor for Color Consultant Pro
# Add to crontab: */30 * * * * /home/ubuntu/color-consultant-pro/scripts/disk-monitor.sh

THRESHOLD=85  # Alert when disk usage exceeds 85%
CRITICAL=95   # Run emergency cleanup at 95%
LOG_FILE="/home/ubuntu/.pm2/logs/disk-monitor.log"
APP_DIR="/home/ubuntu/color-consultant-pro"

# Get current disk usage
USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Log current usage
echo "[$TIMESTAMP] Disk usage: ${USAGE}%" >> $LOG_FILE

# Check if critical
if [ "$USAGE" -ge "$CRITICAL" ]; then
    echo "[$TIMESTAMP] CRITICAL: Disk usage at ${USAGE}%! Running emergency cleanup..." >> $LOG_FILE
    
    # Run emergency cleanup
    $APP_DIR/scripts/emergency-disk-cleanup.sh >> $LOG_FILE 2>&1
    
    # Restart app if needed (in case it crashed due to disk pressure)
    pm2 restart color-consultant-pro >> $LOG_FILE 2>&1 || true
    
    # Send alert (if configured)
    echo "ALERT: Color Consultant Pro disk usage critical at ${USAGE}%" | \
        mail -s "URGENT: Disk Space Critical" ubuntu 2>/dev/null || true
    
elif [ "$USAGE" -ge "$THRESHOLD" ]; then
    echo "[$TIMESTAMP] WARNING: Disk usage at ${USAGE}%" >> $LOG_FILE
    
    # Light cleanup
    npm cache clean --force 2>/dev/null || true
    rm -rf /tmp/color-consultant-update-* 2>/dev/null || true
    pm2 flush 2>/dev/null || true
fi

# Keep log file from growing too large
if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo 0) -gt 10485760 ]; then
    tail -n 1000 "$LOG_FILE" > "$LOG_FILE.tmp"
    mv "$LOG_FILE.tmp" "$LOG_FILE"
fi
