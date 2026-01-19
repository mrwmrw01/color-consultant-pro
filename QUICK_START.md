# Quick Start - AWS EC2 Deployment

The fastest way to deploy Color Consultant Pro to AWS with a custom subdomain.

---

## Prerequisites Checklist

- [ ] AWS account with EC2 access
- [ ] Domain name (e.g., `yourdomain.com`)
- [ ] S3 bucket for photos
- [ ] Anthropic API key from https://console.anthropic.com/
- [ ] SSH key pair for EC2

---

## 5-Minute Setup (TL;DR)

```bash
# 1. Launch EC2 instance (Ubuntu 22.04, t3.medium, 30GB storage)
# 2. Allow ports 22, 80, 443 in security group
# 3. Allocate and attach Elastic IP

# 4. SSH into instance
ssh -i your-key.pem ubuntu@your-elastic-ip

# 5. Install Node.js 20 and PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# 6. Upload code
# On your local machine:
scp -r /home/dad/color-consultant-pro ubuntu@your-elastic-ip:/home/ubuntu/

# 7. Run deployment script
cd /home/ubuntu/color-consultant-pro
chmod +x scripts/deploy-to-ec2.sh
./scripts/deploy-to-ec2.sh
# Follow the prompts

# 8. Point DNS to your Elastic IP
# Add A record: color-consultant.yourdomain.com -> Your Elastic IP

# 9. Install SSL
sudo snap install --classic certbot
sudo certbot --nginx -d color-consultant.yourdomain.com

# 10. Done! Visit https://color-consultant.yourdomain.com
```

---

## Step-by-Step Guide

### 1. Create EC2 Instance

**Via AWS Console:**
1. Go to EC2 Dashboard
2. Click "Launch Instance"
3. Configure:
   - Name: `color-consultant-prod`
   - AMI: Ubuntu Server 22.04 LTS
   - Instance type: `t3.medium` (2 vCPU, 4GB RAM)
   - Key pair: Select or create new
   - Storage: 30 GB gp3
   - Security group:
     - SSH (22): Your IP
     - HTTP (80): 0.0.0.0/0
     - HTTPS (443): 0.0.0.0/0
4. Click "Launch Instance"

**Allocate Elastic IP:**
1. EC2 > Network & Security > Elastic IPs
2. Click "Allocate Elastic IP address"
3. Click "Associate Elastic IP address"
4. Select your instance

### 2. Setup IAM Role for S3 (Recommended)

1. IAM Console > Roles > Create Role
2. Select "AWS service" > "EC2"
3. Attach policy: `AmazonS3FullAccess` (or custom policy)
4. Name: `ColorConsultantEC2Role`
5. Go back to EC2 > Select instance > Actions > Security > Modify IAM role
6. Select `ColorConsultantEC2Role`

### 3. Connect and Deploy

```bash
# Connect to EC2
ssh -i your-key.pem ubuntu@<your-elastic-ip>

# Run initial setup
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt update && sudo apt install -y nodejs
sudo npm install -g pm2

# Exit and upload code from your local machine
exit

# On local machine:
cd /home/dad
scp -i your-key.pem -r color-consultant-pro ubuntu@<your-elastic-ip>:/home/ubuntu/

# SSH back in
ssh -i your-key.pem ubuntu@<your-elastic-ip>

# Run deployment script
cd /home/ubuntu/color-consultant-pro
chmod +x scripts/deploy-to-ec2.sh
./scripts/deploy-to-ec2.sh
```

The script will prompt you for:
- Domain name (e.g., `color-consultant.yourdomain.com`)
- PostgreSQL password
- Anthropic API key
- S3 bucket name
- AWS region

### 4. Configure DNS

**Route 53:**
- Hosted Zones > Select your domain
- Create Record:
  - Name: `color-consultant`
  - Type: A
  - Value: Your Elastic IP
  - TTL: 300

**Other DNS Providers (Cloudflare, Namecheap, etc.):**
- Add A record:
  - Name: `color-consultant`
  - Value: Your Elastic IP
  - TTL: Auto or 300

Wait 5-10 minutes for DNS propagation.

### 5. Install SSL Certificate

```bash
# Install Certbot
sudo snap install --classic certbot

# Get certificate
sudo certbot --nginx -d color-consultant.yourdomain.com

# Follow prompts and choose to redirect HTTP to HTTPS
```

### 6. Verify Deployment

Visit: `https://color-consultant.yourdomain.com`

Check:
- ✅ Site loads over HTTPS
- ✅ Can sign up/sign in
- ✅ Can create project
- ✅ Can upload photos

View logs:
```bash
pm2 logs color-consultant-pro
```

---

## Common Commands

```bash
# View application status
pm2 status

# View logs
pm2 logs color-consultant-pro

# Restart application
pm2 restart color-consultant-pro

# Stop application
pm2 stop color-consultant-pro

# Check database
docker ps | grep postgres
docker logs color-consultant-db

# Check Redis
docker ps | grep redis
docker logs color-consultant-redis

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

---

## Update/Redeploy

```bash
cd /home/ubuntu/color-consultant-pro

# Pull latest code (if using git)
git pull origin main

# Install dependencies
npm install --legacy-peer-deps

# Run migrations
npx prisma generate
npx prisma db push

# Build
npm run build

# Reload app (zero downtime)
pm2 reload color-consultant-pro
```

---

## Troubleshooting

### App won't start
```bash
pm2 logs color-consultant-pro --lines 50
pm2 restart color-consultant-pro
```

### Database issues
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check connection
docker exec -it color-consultant-db psql -U colorapp -d color_consultant_db -c "SELECT 1;"

# View logs
docker logs color-consultant-db
```

### Can't upload photos
```bash
# Verify IAM role
aws sts get-caller-identity

# Test S3 access
aws s3 ls s3://your-bucket-name/

# Check .env
cat .env | grep AWS_
```

### Site not loading
```bash
# Check DNS
dig color-consultant.yourdomain.com

# Check Nginx
sudo nginx -t
sudo systemctl status nginx

# Check PM2
pm2 status
```

### Out of disk space
```bash
# Check disk usage
df -h

# Clean Docker images
docker system prune -a

# Clean old logs
pm2 flush
```

---

## Security Best Practices

1. **Restrict SSH access:**
   ```bash
   # Edit security group to allow SSH only from your IP
   ```

2. **Keep system updated:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **Regular backups:**
   ```bash
   # Database backup
   docker exec color-consultant-db pg_dump -U colorapp color_consultant_db | gzip > backup.sql.gz
   ```

4. **Monitor logs:**
   ```bash
   pm2 logs color-consultant-pro
   ```

5. **Set up CloudWatch alarms** for CPU/Memory/Disk usage

---

## Cost Estimate (Monthly)

- **EC2 t3.medium:** ~$30
- **Elastic IP (when instance running):** $0
- **Storage (30GB):** ~$3
- **Data transfer:** ~$5-10 (varies)
- **S3 storage:** ~$1-5 (depends on photos)
- **RDS PostgreSQL (if used):** ~$15-30
- **ElastiCache Redis (if used):** ~$15-25

**Total:** ~$40-75/month (using Docker) or ~$80-130/month (using RDS/ElastiCache)

**Ways to save:**
- Use Reserved Instance (40% savings)
- Use Savings Plan (20-30% savings)
- Stop instance during off-hours (dev/staging)

---

## Next Steps

After deployment:

1. **Create admin user** (first signup becomes admin)
2. **Seed color database** with paint catalogs
3. **Set up monitoring** with PM2 and CloudWatch
4. **Configure backups** to S3
5. **Test photo uploads** and AI suggestions
6. **Monitor costs** in AWS Cost Explorer

---

## Need Help?

Check the full deployment guide: `DEPLOYMENT_GUIDE.md`

Common issues:
- DNS not working? Wait 10-15 minutes for propagation
- SSL issues? Make sure DNS is working first
- Photos not uploading? Verify IAM role is attached
- Database connection failed? Check Docker is running
- High memory usage? Consider upgrading to t3.large

