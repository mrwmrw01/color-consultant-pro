# Deploy to app.colorgurudesign.com - Subdomain Setup

Deploy Color Consultant Pro to **app.colorgurudesign.com** while keeping your existing Wix site at **colorgurudesign.com**.

---

## ✅ What This Does

- **Main site:** colorgurudesign.com → **Stays on Wix** (unchanged)
- **New app:** app.colorgurudesign.com → **Color Consultant Pro** (on AWS)

Your existing Wix website will remain completely intact!

---

## Step 1: Launch EC2 Instance (10 minutes)

### 1.1 Go to AWS Console

1. Log into AWS: https://console.aws.amazon.com/
2. Go to **EC2 Dashboard**
3. Click **"Launch Instance"**

### 1.2 Configure Instance

```
Name: color-consultant-prod
AMI: Ubuntu Server 22.04 LTS
Instance type: t3.medium
Key pair: [Select yours or create new - SAVE THE .pem FILE!]
Storage: 30 GB gp3
```

**Security Group Rules:**
```
SSH (22): My IP
HTTP (80): 0.0.0.0/0
HTTPS (443): 0.0.0.0/0
```

Click **"Launch Instance"**

### 1.3 Allocate Elastic IP

1. **EC2** → **Elastic IPs** → **"Allocate Elastic IP address"**
2. Click **"Associate Elastic IP address"**
3. Select your instance
4. **Write down this IP:** `___.___.___.___`

### 1.4 Create IAM Role for S3

1. **IAM Console** → **Roles** → **"Create role"**
2. **AWS service** → **EC2** → **Next**
3. Attach: **AmazonS3FullAccess**
4. Name: **ColorConsultantEC2Role**
5. Create role
6. Go back to EC2 → Select instance → **Actions** → **Security** → **Modify IAM role**
7. Select **ColorConsultantEC2Role** → **Update**

---

## Step 2: Configure Wix DNS for Subdomain (5 minutes)

### 2.1 Access Wix DNS

1. Log into **Wix**
2. Go to site dashboard for **colorgurudesign.com**
3. **Settings** → **Domains**
4. Click **colorgurudesign.com**
5. **Advanced DNS** or **Manage DNS Records**

### 2.2 Add Subdomain Record

**Add ONE record only:**

```
Type: A
Host/Name: app
Points to/Value: [Your Elastic IP from Step 1.3]
TTL: 1 Hour (3600)
```

**That's it!** Don't touch any other DNS records.

Click **Save**

### 2.3 Wait for DNS Propagation

Wait **10-15 minutes** minimum (can take up to 1 hour)

### 2.4 Verify DNS

On your computer:

```bash
dig app.colorgurudesign.com
# or
nslookup app.colorgurudesign.com

# Should return your Elastic IP
```

**Important:** Your main site colorgurudesign.com should still work normally on Wix!

---

## Step 3: Connect to EC2 (5 minutes)

```bash
# Connect (replace with YOUR key path and Elastic IP)
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

---

## Step 4: Upload Code (10 minutes)

On your local machine:

```bash
cd /home/dad

# Upload code (replace with YOUR key path and Elastic IP)
scp -i /path/to/your-key.pem -r color-consultant-pro ubuntu@[YOUR-ELASTIC-IP]:/home/ubuntu/

# Wait for upload to complete...
```

---

## Step 5: Run Deployment (15 minutes)

```bash
# SSH back in
ssh -i /path/to/your-key.pem ubuntu@[YOUR-ELASTIC-IP]

# Navigate to project
cd /home/ubuntu/color-consultant-pro

# Run deployment
./scripts/deploy-to-ec2.sh
```

**When prompted, enter:**

```
Domain: app.colorgurudesign.com
  (or just press Enter - it's the default)

PostgreSQL password: [CREATE A STRONG PASSWORD]
  Example: ColorApp2024!Secure#Pass

Anthropic API key: sk-ant-api03-...
  (from console.anthropic.com)

S3 bucket name: [your-bucket-name]

AWS region: us-east-1
  (or just press Enter for default)
```

**Wait for script to complete (10-15 minutes)**

---

## Step 6: Install SSL Certificate (5 minutes)

Still on EC2:

```bash
# Install Certbot
sudo snap install --classic certbot

# Get SSL certificate for subdomain
sudo certbot --nginx -d app.colorgurudesign.com
```

**When prompted:**
```
Email: [your email]
Terms: Y
Share email: N
Redirect HTTP to HTTPS: 2 (Yes)
```

---

## Step 7: Verify Everything Works (10 minutes)

### 7.1 Test the App

Visit: **https://app.colorgurudesign.com**

Should see:
- ✅ Green padlock (HTTPS)
- ✅ Login/Sign up page
- ✅ No security warnings

### 7.2 Test Your Wix Site

Visit: **https://colorgurudesign.com**

Should see:
- ✅ Your original Wix website (unchanged!)

**Perfect!** Both sites work independently.

### 7.3 Create First User

On **app.colorgurudesign.com:**
1. Click "Sign Up"
2. Enter your details
3. Log in
4. Create a test project
5. Upload a photo
6. Try "Get AI Suggestions"

### 7.4 Check System Health

```bash
# On EC2
pm2 status
# Should show: online

docker ps
# Should show: color-consultant-db and color-consultant-redis running
```

---

## Step 8: Setup Backups (5 minutes)

```bash
# On EC2
crontab -e

# Add this line (choose nano if asked for editor):
0 2 * * * /home/ubuntu/color-consultant-pro/scripts/backup.sh >> /home/ubuntu/logs/backup.log 2>&1

# Save and exit (Ctrl+X, Y, Enter)

# Test backup
cd /home/ubuntu/color-consultant-pro
./scripts/backup.sh
```

---

## ✅ Deployment Complete!

**Your setup:**

- 🌐 **Main marketing site:** https://colorgurudesign.com (Wix - unchanged)
- 🎨 **Color Consultant App:** https://app.colorgurudesign.com (AWS - new!)

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

# Update app
cd /home/ubuntu/color-consultant-pro
./scripts/update-deployment.sh

# Backup
./scripts/backup.sh
```

---

## Save These Details

```
App URL: https://app.colorgurudesign.com
Main Site: https://colorgurudesign.com (Wix)
Elastic IP: ___.___.___.___
PostgreSQL Password: [your password]
SSH: ssh -i /path/to/key.pem ubuntu@[ELASTIC-IP]
```

---

## Common Issues

### App not loading

```bash
# Check DNS
dig app.colorgurudesign.com
# Should show your Elastic IP

# Check app is running
pm2 status
```

### SSL certificate error

```bash
sudo certbot certificates
# If expired or missing:
sudo certbot --nginx -d app.colorgurudesign.com
```

### Photos won't upload

```bash
# Verify IAM role
aws sts get-caller-identity

# Test S3
aws s3 ls s3://your-bucket-name/
```

---

## Monthly Costs

**AWS:** ~$40-50/month
- EC2 t3.medium: ~$30
- Storage: ~$3
- Data transfer: ~$5-10
- S3: ~$2-5

**Anthropic AI:** $5/month free tier

**Wix:** Keep your current plan (unchanged)

**Total:** Wix plan + ~$40-50/month for app

---

## Next Steps

1. ✅ Both sites are live
2. Import color catalogs (Sherwin Williams, Benjamin Moore)
3. Test thoroughly
4. Share app.colorgurudesign.com with clients
5. Keep marketing site on Wix
6. Monitor AWS costs in Cost Explorer

---

**Need help?** Check:
- `pm2 logs color-consultant-pro`
- `docker logs color-consultant-db`
- DNS: `dig app.colorgurudesign.com`

**Congratulations!** 🎉 Your app is live at https://app.colorgurudesign.com
