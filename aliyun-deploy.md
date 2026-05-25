# Alibaba Cloud Deployment Guide

## Step 1: Buy Server

1. Open https://ecs.console.aliyun.com
2. Create Instance → 选择 **轻量应用服务器**（最便宜）
3. Region: 选择离你最近的（华南/华东）
4. OS: **Ubuntu 22.04**
5. Spec: 2 vCPU + 2GB RAM（~68/月）
6. Buy and wait for it to start

## Step 2: Configure Firewall

1. In the server console → **防火墙**
2. Add rule: **TCP port 3000** (allow all IPs)
3. Add rule: **TCP port 80** (for nginx later)

## Step 3: Connect via Terminal

1. In the server console → **远程连接** → 通过 TERMINAL 连接
2. Or use SSH from your terminal:
```bash
ssh root@<服务器的公网IP>
```

## Step 4: Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
node -v  # should show v22.x
```

## Step 5: Deploy

```bash
# Clone the repo
cd /root
git clone https://github.com/neopan-shijie/miya-points.git
cd miya-points

# Create .env file (REPLACE with your actual keys)
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://mtjxomealexorhfsqphu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10anhvbWVhbGV4b3JoZnNxcGh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2Mzk0NDgsImV4cCI6MjA5NTIxNTQ0OH0.1bDlRWRc1dVStQesebN-xPWOqDYwrjSFvTEKGBFbWjU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10anhvbWVhbGV4b3JoZnNxcGh1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTYzOTQ0OCwiZXhwIjoyMDk1MjE1NDQ4fQ.z0mafRVDXv68APSY-3mOZ5gQj3aBvQeFcTG_-QgjsvE
NEXT_PUBLIC_APP_URL=http://YOUR_SERVER_IP:3000
EOF

# Build and start
npm install
npm run build
npm i -g pm2
pm2 start npm --name "miya-points" -- start
pm2 save
pm2 startup  # enables auto-start on reboot
```

## Step 6: Test

Open browser: **http://<服务器公网IP>:3000**

## Step 7: Configure Supabase

Add to Supabase Redirect URLs:
```
http://<服务器公网IP>:3000/auth/callback
```
https://supabase.com/dashboard/project/mtjxomealexorhfsqphu/auth/url-configuration

## Optional: Add a Domain

If you later get a domain with ICP filing:
```bash
apt-get install -y nginx
# Then configure nginx to proxy to localhost:3000
```
