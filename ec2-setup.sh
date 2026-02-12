#!/bin/bash
# =============================================================
# One-time EC2 setup script for SaraPesoApp
# Run this on the EC2 instance via SSH:
#   ssh -i your-key.pem ec2-user@your-ec2-host 'bash -s' < ec2-setup.sh
# =============================================================

set -e

REPO_URL="https://github.com/sebastianremar/TrackWeightApp.git"
APP_DIR="/home/ec2-user/SaraPesoApp"

echo "=== 1/6 Installing Node.js 20.x ==="
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs git gcc-c++ make

echo ""
echo "Node version: $(node -v)"
echo "npm version: $(npm -v)"

echo ""
echo "=== 2/6 Installing PM2 ==="
sudo npm install -g pm2

echo ""
echo "=== 3/6 Cloning repository ==="
if [ -d "$APP_DIR" ]; then
    echo "Directory already exists, pulling latest..."
    cd "$APP_DIR"
    git pull origin main
else
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

echo ""
echo "=== 4/7 Installing dependencies & building frontend ==="
cd "$APP_DIR/front"
npm ci
npm run build
cd "$APP_DIR/back"
npm ci --production

echo ""
echo "=== 5/7 Creating .env file ==="
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

if [ ! -f "$APP_DIR/back/.env" ]; then
    cat > "$APP_DIR/back/.env" << EOF
PORT=3000
NODE_ENV=production
JWT_SECRET=$JWT_SECRET
AWS_REGION=us-east-1
CORS_ORIGIN=
LOG_LEVEL=info
USERS_TABLE=Pesos
WEIGHT_TABLE=WeightEntries
FRIENDSHIPS_TABLE=Friendships
HABITS_TABLE=Habits
HABIT_ENTRIES_TABLE=HabitEntries
EOF
    echo ".env created with generated JWT_SECRET"
else
    echo ".env already exists, skipping"
fi

echo ""
echo "=== 6/7 Setting up nginx ==="
sudo yum install -y nginx

sudo cp "$APP_DIR/nginx/sara-peso.conf" /etc/nginx/conf.d/sarapeso.conf

# Remove default server block if it conflicts on port 80
sudo sed -i '/listen\s*80/,/}/{ /server_name/d }' /etc/nginx/nginx.conf 2>/dev/null || true

sudo systemctl enable nginx
sudo systemctl restart nginx

echo ""
echo "=== 7/7 Starting app with PM2 ==="
cd "$APP_DIR/back"
mkdir -p logs
pm2 start ecosystem.config.js --env production
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user

echo ""
echo "============================================"
echo "  Setup complete!"
echo "  App running at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo "============================================"
