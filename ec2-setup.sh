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
echo "=== 4/6 Installing dependencies ==="
cd "$APP_DIR/back"
npm ci --production

echo ""
echo "=== 5/6 Creating .env file ==="
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

if [ ! -f "$APP_DIR/back/.env" ]; then
    cat > "$APP_DIR/back/.env" << EOF
PORT=3000
JWT_SECRET=$JWT_SECRET
AWS_REGION=us-east-1
USERS_TABLE=Pesos
WEIGHT_TABLE=WeightEntries
EOF
    echo ".env created with generated JWT_SECRET"
else
    echo ".env already exists, skipping"
fi

echo ""
echo "=== 6/6 Setting up nginx ==="
sudo yum install -y nginx

sudo tee /etc/nginx/conf.d/sarapeso.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Remove default server block if it conflicts on port 80
sudo sed -i '/listen\s*80/,/}/{ /server_name/d }' /etc/nginx/nginx.conf 2>/dev/null || true

sudo systemctl enable nginx
sudo systemctl restart nginx

echo ""
echo "=== Starting app with PM2 ==="
cd "$APP_DIR/back"
pm2 start server.js --name sara-peso
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user

echo ""
echo "============================================"
echo "  Setup complete!"
echo "  App running at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo "============================================"
