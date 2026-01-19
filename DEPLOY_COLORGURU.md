# Deploy Color Consultant Pro to www.colorgurudesign.com

Quick deployment guide for colorgurudesign.com (currently on Wix).

---

## Important: Moving from Wix to AWS

Since **colorgurudesign.com** is currently hosted on Wix, you'll need to:
1. Point DNS to your AWS server (instead of Wix)
2. This will replace your Wix site with the Color Consultant Pro app

**Note:** If you want to keep your Wix site, consider using a subdomain like `app.colorgurudesign.com` instead.

---

## Step 1: Launch EC2 Instance

### Via AWS Console:

1. Go to **EC2 Dashboard** → Click **"Launch Instance"**

2. **Configure Instance:**
   ```
   Name: color-consultant-prod
   AMI: Ubuntu Server 22.04 LTS
   Instance type: t3.medium (2 vCPU, 4GB RAM)
   Key pair: Create new or select existing
   ```

3. **Configure Storage:**
   ```
   30 GB gp3 SSD
   ```

4. **Network Settings - Security Group:**
   ```
   Create security group: color-consultant-sg

   Inbound Rules:
   - SSH (22): My IP
   - HTTP (80): 0.0.0.0/0
   - HTTPS (443): 0.0.0.0/0
   ```

5. Click **"Launch Instance"**

### Allocate Elastic IP:

1. **EC2** → **Network & Security** → **Elastic IPs**
2. Click **"Allocate Elastic IP address"**
3. Click **"Allocate"**
4. Select the new IP → **Actions** → **"Associate Elastic IP address"**
5. Select your instance → **"Associate"**
6. **Write down this Elastic IP:** `___.___.___.___ `

---

## Step 2: Setup IAM Role for S3

1. **IAM Console** → **Roles** → **"Create role"**
2. Select **"AWS service"** → **"EC2"** → **Next**
3. Search and attach: **`AmazonS3FullAccess`**
4. Role name: **`ColorConsultantEC2Role`**
5. Click **"Create role"**

6. **Attach to EC2:**
   - Go back to EC2 Console
   - Select your instance
   - **Actions** → **Security** → **"Modify IAM role"**
   - Select **`ColorConsultantEC2Role`**
   - Click **"Update IAM role"**

---

## Step 3: Configure Wix DNS

**Important:** This will disconnect your site from Wix hosting and point it to AWS.

### Option A: Use www.colorgurudesign.com (Recommended)

1. Log into **Wix** → Go to your site dashboard
2. Click **"Settings"** → **"Domains"**
3. Click on **colorgurudesign.com**
4. Click **"Advanced DNS"** or **"Manage DNS Records"**

5. **Update/Add these records:**

   **A Record for www:**
   ```
   Type: A
   Host: www
   Points to: [Your Elastic IP]
   TTL: 1 Hour (3600)
   ```

   **A Record for root (optional - redirects colorgurudesign.com → www.colorgurudesign.com):**
   ```
   Type: A
   Host: @
   Points to: [Your Elastic IP]
   TTL: 1 Hour (3600)
   ```

6. **Remove or disable Wix-specific records:**
   - Look for records pointing to Wix servers (like `wix.com` CNAME)
   - Delete or disable them

7. Click **"Save"** or **"Publish"**

### Option B: Use a subdomain (Keep Wix site intact)

If you want to keep your Wix site at colorgurudesign.com:

   **Use app.colorgurudesign.com instead:**
   ```
   Type: A
   Host: app
   Points to: [Your Elastic IP]
   TTL: 1 Hour (3600)
   ```

   Then use `app.colorgurudesign.com` everywhere instead of `www.colorgurudesign.com`

### DNS Propagation

- **Wait 10-30 minutes** for DNS changes to propagate
- Wix DNS can sometimes take longer (up to 2 hours)

### Verify DNS is working:

```bash
# Check if DNS points to your Elastic IP
dig www.colorgurudesign.com
# or
nslookup www.colorgurudesign.com

# Should return your Elastic IP
```

---

## Step 4: Connect to EC2 and Install Prerequisites

```bash
# Connect to your EC2 instance
ssh -i /path/to/your-key.pem ubuntu@[YOUR-ELASTIC-IP]

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should show v20.x

# Install PM2 globally
sudo npm install -g pm2

# Exit for now
exit
```

---

## Step 5: Upload Application Code

```bash
# From your local machine (where the code is)
cd /home/dad

# Upload the entire project
scp -i /path/to/your-key.pem -r color-consultant-pro ubuntu@[YOUR-ELASTIC-IP]:/home/ubuntu/

# This will take a few minutes depending on your upload speed
```

---

## Step 6: Run Automated Deployment

```bash
# SSH back into EC2
ssh -i /path/to/your-key.pem ubuntu@[YOUR-ELASTIC-IP]

# Navigate to project
cd /home/ubuntu/color-consultant-pro

# Run deployment script
./scripts/deploy-to-ec2.sh
```

**When prompted, enter:**

1. **Domain:** `www.colorgurudesign.com` (or just press Enter for default)
2. **PostgreSQL password:** Create a strong password (save this!)
3. **Anthropic API key:** Your API key from console.anthropic.com
4. **AWS S3 bucket name:** Your existing bucket name
5. **AWS region:** `us-east-1` (or your bucket's region, or press Enter for default)

The script will:
- ✅ Install Docker and start PostgreSQL + Redis
- ✅ Create .env file with your settings
- ✅ Install Node.js dependencies
- ✅ Setup database
- ✅ Build the application
- ✅ Configure Nginx
- ✅ Start the app with PM2

**This takes about 10-15 minutes.**

---

## Step 7: Install SSL Certificate

```bash
# Still on EC2, install Certbot
sudo snap install --classic certbot

# Get SSL certificates for both www and non-www
sudo certbot --nginx -d www.colorgurudesign.com -d colorgurudesign.com

# OR if using subdomain:
# sudo certbot --nginx -d app.colorgurudesign.com

# Follow prompts:
# - Enter email: your-email@colorgurudesign.com
# - Agree to terms: Y
# - Share email: N (optional)
# - Redirect HTTP to HTTPS: 2 (Yes, recommended)
```

Certbot will:
- ✅ Get SSL certificate from Let's Encrypt
- ✅ Update Nginx config automatically
- ✅ Setup auto-renewal (certificate valid 90 days, auto-renews at 60 days)

---

## Step 8: Verify Deployment

### Test the site:

Visit: **https://www.colorgurudesign.com**

You should see:
- ✅ Green padlock (HTTPS working)
- ✅ Login/Sign up page
- ✅ No security warnings

### Create first admin user:

1. Click **"Sign Up"**
2. Enter your details
3. First user becomes admin

### Test features:

- ✅ Create a project
- ✅ Upload a photo (will go to your S3 bucket)
- ✅ View photo (thumbnail should load quickly)
- ✅ Annotate photo
- ✅ Click "Get AI Suggestions" (Ralph Wiggum)

---

## Useful Commands

```bash
# SSH into server
ssh -i /path/to/your-key.pem ubuntu@[YOUR-ELASTIC-IP]

# Check app status
pm2 status

# View logs
pm2 logs color-consultant-pro

# Restart app
pm2 restart color-consultant-pro

# Check database
docker ps | grep postgres
docker logs color-consultant-db

# Check Redis
docker ps | grep redis
docker logs color-consultant-redis

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx

# Check SSL certificate status
sudo certbot certificates

# Manual SSL renewal (auto-renews normally)
sudo certbot renew
```

---

## Update/Redeploy Application

When you make code changes:

```bash
# On your local machine, upload new code
scp -i /path/to/your-key.pem -r /home/dad/color-consultant-pro ubuntu@[YOUR-ELASTIC-IP]:/home/ubuntu/

# SSH into server
ssh -i /path/to/your-key.pem ubuntu@[YOUR-ELASTIC-IP]

# Run update script (zero downtime)
cd /home/ubuntu/color-consultant-pro
./scripts/update-deployment.sh
```

---

## Troubleshooting

### DNS not resolving to AWS
```bash
# Check DNS propagation
dig www.colorgurudesign.com

# If still showing Wix servers:
# - Wait longer (can take up to 2 hours for Wix)
# - Verify you saved DNS changes in Wix dashboard
# - Check you removed/disabled old Wix DNS records
```

### "Site not secure" or mixed content warnings
```bash
# Make sure SSL certificate covers both www and non-www
sudo certbot certificates

# If missing, run:
sudo certbot --nginx -d www.colorgurudesign.com -d colorgurudesign.com
```

### Can't connect via SSH
```bash
# Make sure you're using the Elastic IP, not the instance's public IP
# Check security group allows SSH from your IP
# Verify key permissions: chmod 400 /path/to/your-key.pem
```

### App won't start
```bash
pm2 logs color-consultant-pro --lines 50
# Look for errors

# Common issues:
# - Database connection: Check docker ps | grep postgres
# - Redis connection: Check docker ps | grep redis
# - Port 3000 in use: sudo netstat -tlnp | grep 3000
```

### Photos won't upload
```bash
# Verify IAM role is attached
aws sts get-caller-identity

# Test S3 access
aws s3 ls s3://your-bucket-name/

# Check .env has correct bucket name
cat /home/ubuntu/color-consultant-pro/.env | grep AWS_BUCKET
```

### Still seeing Wix site
```bash
# DNS may not have propagated yet
# - Wait 30-60 more minutes
# - Try accessing via Elastic IP directly: http://[ELASTIC-IP]
# - Clear your browser cache
# - Try incognito mode
```

---

## Security Checklist

After deployment:

- ✅ SSH only from your IP (update security group)
- ✅ Strong PostgreSQL password
- ✅ IAM role instead of AWS keys
- ✅ SSL certificate installed
- ✅ HTTPS redirect enabled
- ✅ Firewall configured (AWS security group)
- ✅ Regular backups scheduled

### Schedule automatic backups:

```bash
# SSH into server
ssh -i /path/to/your-key.pem ubuntu@[YOUR-ELASTIC-IP]

# Edit crontab
crontab -e

# Add this line (backup daily at 2 AM):
0 2 * * * /home/ubuntu/color-consultant-pro/scripts/backup.sh >> /home/ubuntu/logs/backup.log 2>&1

# Save and exit
```

---

## Important Notes About Wix

### Your Wix Site Will Be Replaced

Once DNS points to AWS:
- ✅ www.colorgurudesign.com → Color Consultant Pro (AWS)
- ❌ Wix site will no longer be accessible at this domain

### If You Want to Keep Both:

**Option 1: Use subdomain for app**
- Main site: colorgurudesign.com (stays on Wix)
- App: app.colorgurudesign.com (AWS)

**Option 2: Move Wix to subdomain**
- Main app: www.colorgurudesign.com (AWS)
- Old site: wix.colorgurudesign.com (Wix)

**Option 3: Different domain**
- Keep Wix site at colorgurudesign.com
- Use a different domain for the app

### Wix Subscription

After moving to AWS:
- You can cancel your Wix subscription
- Or keep it for email/other services
- Check what features you're using before canceling

---

## Cost Estimate (Monthly)

**AWS Costs:**
- EC2 t3.medium: ~$30.40
- Elastic IP (running): $0
- Storage (30GB): ~$3
- Data transfer: ~$5-10
- S3 storage: ~$1-5 (depends on photos)

**Anthropic AI:**
- Free tier: $5 budget included
- Costs: ~$0.003 per suggestion

**Total: ~$40-50/month**

**Compare to Wix:**
- Wix Business plan: ~$30-50/month
- You're replacing Wix with AWS
- May save money depending on your Wix plan

---

## Next Steps After Deployment

1. **Test thoroughly**
   - Upload photos
   - Create annotations
   - Try AI suggestions
   - Test on mobile

2. **Seed Color Database**
   - Import Sherwin Williams catalog
   - Import Benjamin Moore catalog

3. **Set up monitoring**
   ```bash
   pm2 monit
   ```

4. **Configure backups**
   - Already scheduled daily
   - Optionally sync to S3

5. **Cancel Wix** (if not needed)
   - Export any data first
   - Keep domain registration

---

## Quick Reference

```bash
# Full deployment command sequence:
ssh -i your-key.pem ubuntu@YOUR-ELASTIC-IP
cd /home/ubuntu/color-consultant-pro
./scripts/deploy-to-ec2.sh

# After DNS is configured and propagated:
sudo certbot --nginx -d www.colorgurudesign.com -d colorgurudesign.com

# Update later:
./scripts/update-deployment.sh

# Backup:
./scripts/backup.sh
```

**Live URL:** https://www.colorgurudesign.com

**Alternative URL (if using subdomain):** https://app.colorgurudesign.com

---

## Support

If you get stuck, check:
1. `pm2 logs color-consultant-pro`
2. `docker ps` (ensure postgres & redis running)
3. `sudo tail -f /var/log/nginx/error.log`
4. DNS with `dig www.colorgurudesign.com`
5. Verify DNS changed in Wix dashboard

**Common Wix DNS issue:** Changes can take 2-4 hours. Be patient!
