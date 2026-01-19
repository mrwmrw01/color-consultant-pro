# 🚀 Start Here - Deploy to app.colorgurudesign.com

Everything is ready! Deploy Color Consultant Pro while keeping your Wix site intact.

---

## ✅ Your Setup (Option B - Subdomain)

You've chosen to keep both sites:

- **Main site:** colorgurudesign.com → **Stays on Wix** (unchanged)
- **Color Consultant App:** app.colorgurudesign.com → **New AWS app**

Your existing Wix website will remain completely intact! The app will be on a subdomain.

---

## 📋 Your Deployment Guide

**Follow this:** [`DEPLOY_APP_SUBDOMAIN.md`](./DEPLOY_APP_SUBDOMAIN.md)

This simplified guide takes you from AWS setup to live app in ~1 hour.

---

## 🎯 Quick Overview

Here's what you'll do:

### 1. AWS Setup (20 min)
- Launch EC2 instance
- Allocate Elastic IP
- Create IAM role for S3

### 2. Wix DNS - Add Subdomain (5 min)
- Log into Wix
- Add ONE A record: `app` → Your Elastic IP
- That's it! Don't touch other records

### 3. Deploy Application (30 min)
- Upload code to EC2
- Run deployment script
- Install SSL certificate

### 4. Verify (10 min)
- Test app.colorgurudesign.com loads
- Test colorgurudesign.com still works (Wix)
- Create first user and test features

**Total time:** About 1 hour

---

## ✅ What You Need

Before starting:

- [ ] **AWS Account**
- [ ] **EC2 SSH Key** (.pem file) - or create during setup
- [ ] **Wix Login** for colorgurudesign.com
- [ ] **Anthropic API Key** from https://console.anthropic.com/
  - Sign up free
  - Create API key (starts with `sk-ant-`)
- [ ] **AWS S3 Bucket** for photos
  - Create in S3 Console
  - Name: `colorguru-photos` (or similar)
  - Region: us-east-1
- [ ] **1 hour** of time

---

## 💰 Costs

### AWS (New - for the app)
- EC2 t3.medium: ~$30/month
- Storage: ~$3/month
- S3: ~$2-5/month
- **Total: ~$35-40/month**

### Wix (Existing - unchanged)
- Your current Wix plan continues
- No changes needed

### Anthropic AI
- Free tier: $5/month included
- ~1,600 AI suggestions free

**New monthly cost:** ~$35-40 for AWS (in addition to your Wix plan)

---

## 🚀 Ready to Deploy?

### Step 1: Open the Guide

Open **[DEPLOY_APP_SUBDOMAIN.md](./DEPLOY_APP_SUBDOMAIN.md)** and follow along.

### Step 2: Log Into AWS

Go to https://console.aws.amazon.com/

### Step 3: Follow Each Step

The guide has 8 simple steps with copy/paste commands.

---

## 🔑 Key Points

### DNS Configuration
- You'll only add **ONE record** in Wix DNS
- Type: A, Host: `app`, Points to: Your Elastic IP
- **Don't touch** any other DNS records!
- Your Wix site keeps working normally

### Two Sites Running
After deployment:
- **colorgurudesign.com** → Wix (existing marketing site)
- **app.colorgurudesign.com** → AWS (new Color Consultant Pro)

### Completely Independent
- Wix site: No changes at all
- App site: New and separate
- No conflicts between them

---

## 🆘 If You Get Stuck

### Quick Fixes

**Can't SSH?**
```bash
chmod 400 /path/to/your-key.pem
```

**App subdomain not resolving?**
- Wait 15-30 more minutes
- Verify A record saved in Wix
- Check: `dig app.colorgurudesign.com`

**App won't start?**
```bash
pm2 logs color-consultant-pro
```

**Main site broken?**
- This shouldn't happen - you only added ONE record
- Check Wix DNS - make sure you didn't delete anything
- Contact Wix support if needed

### Full Troubleshooting

See: [DEPLOY_APP_SUBDOMAIN.md](./DEPLOY_APP_SUBDOMAIN.md) (bottom section)

---

## ✨ What You'll Have

After deployment:

**Marketing Site (colorgurudesign.com - Wix):**
- ✅ Unchanged
- ✅ Same content
- ✅ Same features
- ✅ Managed in Wix

**Color Consultant App (app.colorgurudesign.com - AWS):**
- ✅ Photo upload & annotation
- ✅ AI color suggestions
- ✅ Image optimization
- ✅ Professional tools
- ✅ Fast & secure
- ✅ Mobile responsive

---

## 🎉 After Deployment

Once both sites are live:

### On Your App (app.colorgurudesign.com)
1. Create admin account
2. Import color catalogs
3. Create test project
4. Upload photos
5. Try annotations
6. Test AI suggestions

### On Your Wix Site (colorgurudesign.com)
1. Add link to app
2. Update navigation
3. Maybe add "Launch App" button
4. Link to app.colorgurudesign.com

### Share With Clients
- Marketing site: colorgurudesign.com
- Direct app access: app.colorgurudesign.com
- Clean separation of concerns

---

## 🏁 Let's Get Started!

**Next:** Open [DEPLOY_APP_SUBDOMAIN.md](./DEPLOY_APP_SUBDOMAIN.md) and start with Step 1.

**Time:** ~1 hour

**Result:**
- ✅ Your Wix site stays at colorgurudesign.com
- ✅ New app live at app.colorgurudesign.com

Good luck! 🚀

---

## Quick Checklist

- [ ] Have AWS account access
- [ ] Have Wix login
- [ ] Have Anthropic API key
- [ ] Have S3 bucket name
- [ ] Have 1 hour free
- [ ] Ready to deploy

**All set?** → [DEPLOY_APP_SUBDOMAIN.md](./DEPLOY_APP_SUBDOMAIN.md)
