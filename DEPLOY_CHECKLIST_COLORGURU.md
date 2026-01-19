# Deployment Checklist - www.colorgurudesign.com

Follow this step-by-step to deploy Color Consultant Pro.

---

## ⚠️ Important Decision First

**Your domain colorgurudesign.com is currently on Wix.**

Choose one:

- [ ] **Option A:** Replace Wix site with Color Consultant Pro at **www.colorgurudesign.com**
  - ✅ Clean, professional main domain
  - ❌ Wix site will no longer be accessible
  - Use this checklist as-is

- [ ] **Option B:** Keep Wix site, use subdomain **app.colorgurudesign.com**
  - ✅ Keep your Wix site intact
  - ✅ App at clean subdomain
  - Replace `www.colorgurudesign.com` with `app.colorgurudesign.com` throughout

**Which option?** __________

---

## Before You Start

Gather these items:

- [ ] AWS account login
- [ ] Your EC2 SSH key (`.pem` file) or create new
- [ ] Anthropic API key from https://console.anthropic.com/
- [ ] AWS S3 bucket name (where photos will be stored)
- [ ] Wix login for colorgurudesign.com

---

## Phase 1: AWS Setup (30 minutes)

### ☐ 1.1 Launch EC2 Instance

**AWS Console > EC2 > Launch Instance:**

```
Name: color-consultant-prod
AMI: Ubuntu Server 22.04 LTS
Instance type: t3.medium
Key pair: [Select yours or create new - SAVE THE .pem FILE!]
Storage: 30 GB gp3

Security Group Rules:
✓ SSH (22) from My IP
✓ HTTP (80) from 0.0.0.0/0
✓ HTTPS (443) from 0.0.0.0/0
```

- [ ] Instance launched
- [ ] Instance is running (Status: Running, 2/2 checks passed)
- [ ] Downloaded `.pem` key (if new)

### ☐ 1.2 Allocate Elastic IP

**EC2 > Network & Security > Elastic IPs:**

- [ ] Click "Allocate Elastic IP address"
- [ ] Click "Associate Elastic IP address"
- [ ] Select your instance
- [ ] **Write down this IP:** `___.___.___.___`

### ☐ 1.3 Create IAM Role for S3

**IAM Console > Roles > Create role:**

```
Trusted entity: AWS service > EC2
Permission: AmazonS3FullAccess
Name: ColorConsultantEC2Role
```

- [ ] Role created
- [ ] Attached to EC2 instance (Actions > Security > Modify IAM role)

---

## Phase 2: DNS Setup in Wix (15 minutes)

### ☐ 2.1 Access Wix DNS Settings

1. Log into **Wix**
2. Go to your site dashboard for **colorgurudesign.com**
3. Click **"Settings"** → **"Domains"**
4. Click on **colorgurudesign.com**
5. Look for **"Advanced DNS"** or **"Manage DNS Records"** or **"DNS Settings"**

- [ ] Found DNS management page

### ☐ 2.2 Configure DNS Records

**For Option A (www.colorgurudesign.com):**

Add/Update these records:

```
Record 1:
Type: A
Host/Name: www
Points to/Value: [Your Elastic IP from 1.2]
TTL: 1 Hour or 3600

Record 2 (optional - redirects naked domain):
Type: A
Host/Name: @ (or leave blank)
Points to/Value: [Your Elastic IP from 1.2]
TTL: 1 Hour or 3600
```

**For Option B (app.colorgurudesign.com):**

Add this record:

```
Type: A
Host/Name: app
Points to/Value: [Your Elastic IP from 1.2]
TTL: 1 Hour or 3600
```

- [ ] A record(s) added
- [ ] Old Wix DNS records removed/disabled (if replacing Wix site)
- [ ] Changes saved

### ☐ 2.3 Wait for DNS Propagation

- [ ] Waited 10-15 minutes (minimum)
- [ ] DNS propagated (can take up to 2 hours for Wix)

### ☐ 2.4 Verify DNS

On your computer:

```bash
dig www.colorgurudesign.com
# or for subdomain:
# dig app.colorgurudesign.com

# Should return your Elastic IP
```

- [ ] DNS returns correct Elastic IP
- [ ] If not, wait longer and try again

---

## Phase 3: Server Setup (5 minutes)

### ☐ 3.1 Connect and Install Node.js

```bash
# Connect (replace with your key path and Elastic IP)
ssh -i /path/to/your-key.pem ubuntu@[YOUR-ELASTIC-IP]

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Verify
node --version  # Should show v20.x
pm2 --version   # Should show version

# Exit
exit
```

- [ ] Connected successfully
- [ ] Node.js v20.x installed
- [ ] PM2 installed
- [ ] No errors

---

## Phase 4: Upload Code (10 minutes)

### ☐ 4.1 Upload Application

On your local machine:

```bash
cd /home/dad

# Upload code (replace with your key path and Elastic IP)
scp -i /path/to/your-key.pem -r color-consultant-pro ubuntu@[YOUR-ELASTIC-IP]:/home/ubuntu/
```

**This will take several minutes** - wait for it to complete.

- [ ] Upload started
- [ ] Upload completed (100%)
- [ ] No errors

---

## Phase 5: Deploy Application (15 minutes)

### ☐ 5.1 Run Deployment Script

```bash
# SSH back in
ssh -i /path/to/your-key.pem ubuntu@[YOUR-ELASTIC-IP]

# Navigate to project
cd /home/ubuntu/color-consultant-pro

# Make script executable (if needed)
chmod +x scripts/deploy-to-ec2.sh

# Run deployment
./scripts/deploy-to-ec2.sh
```

### ☐ 5.2 Enter Configuration

When prompted, enter:

```
Domain: www.colorgurudesign.com
  (or app.colorgurudesign.com if using subdomain)
  (or just press Enter for default www.colorgurudesign.com)

PostgreSQL password: [CREATE A STRONG PASSWORD - SAVE IT!]
  Example: ColorApp2024!SecurePass#789

Anthropic API key: sk-ant-api03-...
  (from console.anthropic.com)

S3 bucket name: [your-bucket-name]

AWS region: us-east-1
  (or your bucket's region, or press Enter for default)
```

**Wait for script to complete (10-15 minutes)**

You'll see:
- Installing dependencies ✓
- Starting PostgreSQL & Redis ✓
- Creating .env ✓
- Building application ✓
- Configuring Nginx ✓
- Starting PM2 ✓

- [ ] Script completed successfully
- [ ] No errors (warnings about Node version are OK)
- [ ] Saw "✅ Deployment complete!"

---

## Phase 6: SSL Certificate (5 minutes)

### ☐ 6.1 Install Certbot

Still on EC2:

```bash
# Install Certbot
sudo snap install --classic certbot
```

- [ ] Certbot installed

### ☐ 6.2 Get SSL Certificate

**For www.colorgurudesign.com (with both www and naked domain):**

```bash
sudo certbot --nginx -d www.colorgurudesign.com -d colorgurudesign.com
```

**OR for app.colorgurudesign.com (subdomain only):**

```bash
sudo certbot --nginx -d app.colorgurudesign.com
```

When prompted:

```
Email: [your email]
Terms: Y (agree)
Share email: N (optional)
Redirect HTTP to HTTPS: 2 (Yes, recommended)
```

**Wait for certificate to be issued**

- [ ] Email entered
- [ ] Certificate obtained successfully
- [ ] Nginx automatically configured
- [ ] No errors

---

## Phase 7: Verify Deployment (10 minutes)

### ☐ 7.1 Test Website

Visit: **https://www.colorgurudesign.com**
(or **https://app.colorgurudesign.com** if using subdomain)

- [ ] Site loads
- [ ] Green padlock showing (HTTPS secure)
- [ ] Login/Sign up page appears
- [ ] No security warnings
- [ ] No browser errors

**If site doesn't load:**
- Check DNS: `dig www.colorgurudesign.com`
- Wait longer for DNS propagation
- Try accessing via IP: `http://[YOUR-ELASTIC-IP]`
- Check logs: `pm2 logs color-consultant-pro`

### ☐ 7.2 Create First User

- [ ] Click "Sign Up"
- [ ] Enter your details:
  - Email: _________________
  - Password: _________________
  - Name: _________________
- [ ] Successfully registered
- [ ] Successfully logged in
- [ ] Dashboard loads

### ☐ 7.3 Test Core Features

Test each feature:

- [ ] Create a project (click "New Project")
- [ ] Enter project details and save
- [ ] Click "Upload Photos"
- [ ] Upload a test photo
- [ ] Photo appears in gallery
- [ ] Thumbnail loads quickly (~15KB)
- [ ] Click photo to view details
- [ ] Click "Annotate" button
- [ ] Annotation canvas loads
- [ ] Draw a test annotation
- [ ] Select a color
- [ ] Select surface type
- [ ] Save annotation
- [ ] Click "Get AI Suggestions" button
- [ ] Ralph Wiggum responds with suggestions
- [ ] Suggestions appear in dialog

### ☐ 7.4 Check System Health

```bash
# On EC2, check status
pm2 status
# Should show: color-consultant-pro | online

pm2 logs color-consultant-pro --lines 20
# Should show normal operation, no critical errors

docker ps
# Should show: color-consultant-db and color-consultant-redis running

# Check Nginx
sudo systemctl status nginx
# Should show: active (running)
```

- [ ] PM2 status: online
- [ ] No critical errors in logs
- [ ] PostgreSQL container: running
- [ ] Redis container: running
- [ ] Nginx: active

---

## Phase 8: Setup Backups (5 minutes)

### ☐ 8.1 Schedule Daily Backups

On EC2:

```bash
# Create logs directory
mkdir -p /home/ubuntu/logs

# Edit crontab
crontab -e

# If asked to choose editor: select nano (easiest)

# Add this line at the bottom:
0 2 * * * /home/ubuntu/color-consultant-pro/scripts/backup.sh >> /home/ubuntu/logs/backup.log 2>&1

# Save and exit (Ctrl+X, then Y, then Enter)
```

- [ ] Cron job added
- [ ] Crontab saved

### ☐ 8.2 Test Backup Manually

```bash
cd /home/ubuntu/color-consultant-pro
./scripts/backup.sh

# Check backup was created
ls -lh /home/ubuntu/backups/
```

- [ ] Backup script ran successfully
- [ ] Backup file created in /home/ubuntu/backups/
- [ ] No errors

---

## ✅ Deployment Complete!

Your app is live at:
- **https://www.colorgurudesign.com**
  (or **https://app.colorgurudesign.com** if using subdomain)

---

## Save These Important Details

**Write down and save securely:**

```
Domain: www.colorgurudesign.com
Elastic IP: ___.___.___.___
EC2 Key: /path/to/your-key.pem
PostgreSQL Password: [your password]
Admin Email: [your email]
Admin Password: [your password]
S3 Bucket: [your bucket name]

SSH Command:
ssh -i /path/to/your-key.pem ubuntu@[ELASTIC-IP]
```

---

## Quick Reference Commands

```bash
# SSH into server
ssh -i /path/to/your-key.pem ubuntu@[ELASTIC-IP]

# Check app status
pm2 status

# View logs
pm2 logs color-consultant-pro

# Restart app
pm2 restart color-consultant-pro

# Update code (after making changes)
./scripts/update-deployment.sh

# Create backup
./scripts/backup.sh

# Check database
docker ps | grep postgres

# Check SSL
sudo certbot certificates

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
```

---

## Common Issues & Quick Fixes

### Issue: Site not loading

**Check DNS:**
```bash
dig www.colorgurudesign.com
```
- If not showing your IP: Wait longer (DNS can take 2 hours on Wix)
- Try clearing browser cache
- Try incognito/private mode

**Check app is running:**
```bash
pm2 status
# Should show "online"
```

### Issue: Still seeing Wix site

- DNS hasn't propagated yet (wait 30-60 more minutes)
- Clear browser cache
- Verify DNS changes saved in Wix
- Try accessing via IP directly: `http://[ELASTIC-IP]`

### Issue: SSL certificate error

```bash
# Check certificate
sudo certbot certificates

# If expired or missing, renew:
sudo certbot --nginx -d www.colorgurudesign.com -d colorgurudesign.com
```

### Issue: Can't upload photos

```bash
# Verify IAM role attached
aws sts get-caller-identity

# Test S3 access
aws s3 ls s3://your-bucket-name/
```

### Issue: App won't start

```bash
# Check logs
pm2 logs color-consultant-pro --lines 50

# Restart containers
docker restart color-consultant-db color-consultant-redis

# Restart app
pm2 restart color-consultant-pro
```

---

## Next Steps

1. **Import color catalogs**
   - Sherwin Williams colors
   - Benjamin Moore colors

2. **Configure user accounts**
   - Invite team members
   - Set user tiers

3. **Test on mobile**
   - iOS Safari
   - Android Chrome

4. **Monitor costs**
   - AWS Cost Explorer
   - Set up billing alerts

5. **Consider canceling Wix**
   - If you replaced your Wix site
   - Export any data first
   - Keep domain registration

---

## Monthly Costs

**AWS:** ~$40-50/month
- EC2 t3.medium: ~$30
- Storage: ~$3
- Data transfer: ~$5-10
- S3: ~$2-5

**Anthropic AI:** Included in free tier ($5/month budget)

**Total:** ~$40-50/month

**Compared to Wix:** You're replacing Wix hosting, may save money depending on your current plan

---

**Need help?** See `DEPLOY_COLORGURU.md` for detailed troubleshooting.

**Congratulations!** 🎉 Your Color Consultant Pro app is live!
