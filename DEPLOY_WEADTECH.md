# Deploy Color Consultant Pro to color-consultant.weadtech.net

Quick deployment guide customized for your setup.

---

## Step 1: Launch EC2 Instance

### Via AWS Console:

1. Go to **EC2 Dashboard** → Click **"Launch Instance"**

2. **Configure Instance:**
   ```
   Name: color-consultant-prod
   AMI: Ubuntu Server 22.04 LTS (Free tier eligible)
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
   - SSH (22): My IP (Your current IP)
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
6. **Note this IP address** - you'll need it for DNS

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

## Step 3: Configure GoDaddy DNS

1. Log into **GoDaddy** → **My Products** → **DNS** for weadtech.net

2. **Add A Record:**
   ```
   Type: A
   Name: color-consultant
   Value: [Your Elastic IP from Step 1]
   TTL: 1 Hour (or 600 seconds)
   ```

3. Click **"Save"**

4. **Wait 5-10 minutes** for DNS propagation

5. **Verify DNS is working:**
   ```bash
   # On your local machine
   dig color-consultant.weadtech.net
   # Or
   nslookup color-consultant.weadtech.net
   ```

   Should return your Elastic IP

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

1. **Domain:** `color-consultant.weadtech.net`
2. **PostgreSQL password:** Create a strong password (save this!)
3. **Anthropic API key:** Your API key from console.anthropic.com
4. **AWS S3 bucket name:** Your existing bucket name
5. **AWS region:** `us-east-1` (or your bucket's region)

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

# Get SSL certificate for your domain
sudo certbot --nginx -d color-consultant.weadtech.net

# Follow prompts:
# - Enter email: your-email@weadtech.net
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

Visit: **https://color-consultant.weadtech.net**

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

# Create database backup
cd /home/ubuntu/color-consultant-pro
./scripts/backup.sh
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

### DNS not resolving
```bash
# Check DNS propagation
dig color-consultant.weadtech.net

# If showing old IP or not found, wait 10-15 more minutes
# GoDaddy DNS can take up to 1 hour in some cases
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

### SSL certificate issues
```bash
# Make sure DNS is working FIRST
dig color-consultant.weadtech.net

# If DNS works but Certbot fails:
sudo certbot --nginx -d color-consultant.weadtech.net --dry-run

# Check Nginx config
sudo nginx -t
```

### Out of memory
```bash
# Check memory usage
free -h

# Add swap if needed (2GB)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
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

## Cost Estimate (Monthly)

**AWS Costs:**
- EC2 t3.medium: ~$30.40
- Elastic IP (running): $0
- Storage (30GB): ~$3
- Data transfer: ~$5-10
- S3 storage: ~$1-5 (depends on photos)

**Anthropic AI:**
- Free tier: $5 budget included
- Costs: ~$0.003 per suggestion (1,600+ suggestions on free tier)

**Total: ~$40-50/month**

**Save money:**
- Reserved Instance (1 year): 40% savings = ~$24-35/month
- Stop instance during off-hours if not 24/7

---

## What's Running Where

```
color-consultant.weadtech.net (Elastic IP)
    ↓
Nginx (Port 80/443)
    ↓ Reverse Proxy
PM2 (Next.js app on Port 3000)
    ↓ Connects to
PostgreSQL (Docker, Port 5432)
Redis (Docker, Port 6379)
    ↓ Files stored in
AWS S3 (Your bucket)
```

---

## Next Steps After Deployment

1. **Seed Color Database**
   - Import Sherwin Williams color catalog
   - Import Benjamin Moore color catalog
   - Add product lines and sheens

2. **Test AI Suggestions**
   - Upload a photo
   - Annotate with colors
   - Click "Get AI Suggestions"
   - Verify Ralph Wiggum responds

3. **Monitor Performance**
   ```bash
   pm2 monit  # Real-time CPU/memory
   pm2 logs   # Application logs
   ```

4. **Set Up CloudWatch** (optional)
   - Monitor EC2 CPU/memory/disk
   - Set alarms for high usage
   - Track S3 storage costs

5. **Configure Backups**
   - Already scheduled daily at 2 AM
   - Optionally upload to S3:
     ```bash
     # Edit scripts/backup.sh and uncomment the S3 upload lines
     ```

---

## Support

**Your deployment URLs:**
- Site: https://color-consultant.weadtech.net
- API health: https://color-consultant.weadtech.net/api/health (if you add this endpoint)

**Logs location on server:**
- App logs: `/home/ubuntu/logs/`
- PM2 logs: `pm2 logs`
- Nginx logs: `/var/log/nginx/`
- Docker logs: `docker logs [container-name]`

**Backup location:**
- `/home/ubuntu/backups/`

If you get stuck, check:
1. `pm2 logs color-consultant-pro`
2. `docker ps` (ensure postgres & redis running)
3. `sudo tail -f /var/log/nginx/error.log`
4. DNS with `dig color-consultant.weadtech.net`

---

## Quick Reference

```bash
# Full deployment command sequence:
ssh -i your-key.pem ubuntu@YOUR-ELASTIC-IP
cd /home/ubuntu/color-consultant-pro
./scripts/deploy-to-ec2.sh

# After DNS is configured:
sudo certbot --nginx -d color-consultant.weadtech.net

# Update later:
./scripts/update-deployment.sh

# Backup:
./scripts/backup.sh
```

**Done!** Visit https://color-consultant.weadtech.net 🎨
