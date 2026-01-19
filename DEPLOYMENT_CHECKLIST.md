# Deployment Checklist - color-consultant.weadtech.net

Follow this step-by-step to deploy successfully.

---

## Before You Start

Gather these items:

- [ ] AWS account login
- [ ] Your EC2 SSH key (`.pem` file)
- [ ] Anthropic API key from https://console.anthropic.com/
- [ ] AWS S3 bucket name (where photos will be stored)
- [ ] GoDaddy login for weadtech.net

---

## Phase 1: AWS Setup (30 minutes)

### ☐ 1.1 Launch EC2 Instance

**AWS Console > EC2 > Launch Instance:**

```
Name: color-consultant-prod
AMI: Ubuntu Server 22.04 LTS
Instance type: t3.medium
Key pair: [Select yours or create new]
Storage: 30 GB gp3

Security Group Rules:
✓ SSH (22) from My IP
✓ HTTP (80) from 0.0.0.0/0
✓ HTTPS (443) from 0.0.0.0/0
```

- [ ] Instance launched
- [ ] Instance is running
- [ ] Downloaded `.pem` key (if new)

### ☐ 1.2 Allocate Elastic IP

**EC2 > Network & Security > Elastic IPs:**

- [ ] Click "Allocate Elastic IP address"
- [ ] Click "Associate Elastic IP address"
- [ ] Select your instance
- [ ] **Write down this IP:** `___.___.___.___ `

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

## Phase 2: DNS Setup (10 minutes)

### ☐ 2.1 Configure GoDaddy DNS

**GoDaddy > My Products > DNS (weadtech.net):**

```
Type: A
Name: color-consultant
Value: [Your Elastic IP from step 1.2]
TTL: 1 Hour
```

- [ ] A record added
- [ ] Saved changes
- [ ] Waited 5-10 minutes

### ☐ 2.2 Verify DNS

On your computer:

```bash
dig color-consultant.weadtech.net
# or
nslookup color-consultant.weadtech.net
```

- [ ] DNS returns your Elastic IP

---

## Phase 3: Server Setup (5 minutes)

### ☐ 3.1 Connect and Install Node.js

```bash
# Connect
ssh -i /path/to/your-key.pem ubuntu@[YOUR-ELASTIC-IP]

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Verify
node --version  # Should show v20.x

# Exit
exit
```

- [ ] Connected successfully
- [ ] Node.js installed
- [ ] PM2 installed

---

## Phase 4: Upload Code (10 minutes)

### ☐ 4.1 Upload Application

On your local machine:

```bash
cd /home/dad
scp -i /path/to/your-key.pem -r color-consultant-pro ubuntu@[YOUR-ELASTIC-IP]:/home/ubuntu/
```

- [ ] Code uploaded (takes a few minutes)
- [ ] No errors

---

## Phase 5: Deploy Application (15 minutes)

### ☐ 5.1 Run Deployment Script

```bash
# SSH back in
ssh -i /path/to/your-key.pem ubuntu@[YOUR-ELASTIC-IP]

# Navigate to project
cd /home/ubuntu/color-consultant-pro

# Run deployment
./scripts/deploy-to-ec2.sh
```

### ☐ 5.2 Enter Configuration

When prompted, enter:

```
Domain: color-consultant.weadtech.net (default - just press Enter)
PostgreSQL password: [Create strong password]
Anthropic API key: sk-ant-...
S3 bucket name: [Your bucket name]
AWS region: us-east-1 (default - just press Enter)
```

- [ ] Script completed successfully
- [ ] No errors
- [ ] PM2 shows app running

---

## Phase 6: SSL Certificate (5 minutes)

### ☐ 6.1 Install Certbot and Get Certificate

Still on EC2:

```bash
# Install Certbot
sudo snap install --classic certbot

# Get SSL certificate
sudo certbot --nginx -d color-consultant.weadtech.net
```

When prompted:

```
Email: [your-email@weadtech.net]
Terms: Y (agree)
Share email: N (optional)
Redirect HTTP to HTTPS: 2 (Yes)
```

- [ ] Certificate obtained
- [ ] Nginx restarted
- [ ] No errors

---

## Phase 7: Verify Deployment (10 minutes)

### ☐ 7.1 Test Website

Visit: **https://color-consultant.weadtech.net**

- [ ] Site loads with green padlock (HTTPS)
- [ ] Login/Sign up page appears
- [ ] No security warnings

### ☐ 7.2 Create First User

- [ ] Click "Sign Up"
- [ ] Enter your details
- [ ] Successfully logged in

### ☐ 7.3 Test Core Features

- [ ] Create a project
- [ ] Upload a photo
- [ ] Photo appears in gallery (thumbnail loads)
- [ ] Click photo to annotate
- [ ] Draw annotation
- [ ] Select color
- [ ] Click "Get AI Suggestions"
- [ ] Ralph Wiggum responds

### ☐ 7.4 Check Logs

```bash
# On EC2
pm2 status
pm2 logs color-consultant-pro

# Should show no errors
```

- [ ] App status: online
- [ ] No critical errors in logs

---

## Phase 8: Setup Backups (5 minutes)

### ☐ 8.1 Schedule Daily Backups

On EC2:

```bash
# Edit crontab
crontab -e

# Add this line:
0 2 * * * /home/ubuntu/color-consultant-pro/scripts/backup.sh >> /home/ubuntu/logs/backup.log 2>&1

# Save and exit (Ctrl+X, Y, Enter)
```

- [ ] Cron job added
- [ ] Test backup manually: `./scripts/backup.sh`

---

## ✅ Deployment Complete!

Your app is live at: **https://color-consultant.weadtech.net**

---

## Quick Reference Commands

Save these for later:

```bash
# SSH into server
ssh -i /path/to/your-key.pem ubuntu@[YOUR-ELASTIC-IP]

# Check app status
pm2 status

# View logs
pm2 logs color-consultant-pro

# Restart app
pm2 restart color-consultant-pro

# Update code
./scripts/update-deployment.sh

# Create backup
./scripts/backup.sh

# Check database
docker ps | grep postgres

# Check SSL certificate
sudo certbot certificates

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
```

---

## Common Issues & Fixes

### DNS not resolving
```bash
# Wait 10-15 more minutes, GoDaddy can be slow
dig color-consultant.weadtech.net
```

### Can't SSH
```bash
# Fix key permissions
chmod 400 /path/to/your-key.pem

# Check security group allows your IP
```

### App won't start
```bash
pm2 logs color-consultant-pro --lines 50
# Check for errors

# Restart containers
docker restart color-consultant-db color-consultant-redis
```

### Photos won't upload
```bash
# Verify IAM role
aws sts get-caller-identity

# Test S3
aws s3 ls s3://your-bucket-name/
```

---

## What to Track

Keep these handy:

```
Elastic IP: ___.___.___.___
Domain: color-consultant.weadtech.net
PostgreSQL Password: [Saved securely]
S3 Bucket: [Your bucket name]
SSH Command: ssh -i /path/to/key.pem ubuntu@[ELASTIC-IP]
```

---

## Next Steps

1. **Import color catalogs** (Sherwin Williams, Benjamin Moore)
2. **Test AI suggestions** thoroughly
3. **Monitor costs** in AWS Cost Explorer
4. **Set up CloudWatch alarms** (optional)
5. **Train users** on the platform

---

**Need help?** Check `DEPLOY_WEADTECH.md` for detailed troubleshooting.

**Monthly cost:** ~$40-50 (EC2 + S3 + data transfer)
