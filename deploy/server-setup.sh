#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# FarmFlow — DigitalOcean Droplet: One-Time Server Setup
# Run as root on a fresh Ubuntu 22.04 / 24.04 droplet:
#   bash server-setup.sh
#
# What this does:
#   1. System update + essential packages
#   2. Node.js 20 + PM2
#   3. Nginx
#   4. UFW firewall rules
#   5. App user + directories
#   6. Clone repo + install deps + build frontend
#   7. Write backend .env (prompts for secrets)
#   8. Start backend with PM2 and save process list
#   9. Link Nginx config + reload
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

REPO_URL="https://github.com/YOUR_GITHUB_USER/FarmFlow.git"  # <── change this
APP_DIR="/var/www/farmflow"
LOG_DIR="/var/log/farmflow"

echo "──────────────────────────────────────────"
echo " FarmFlow Droplet Setup"
echo "──────────────────────────────────────────"

# ── 1. System packages ────────────────────────────────────────────────────────
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git unzip nginx ufw

# ── 2. Node.js 20 via NodeSource ──────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "Node: $(node -v)  npm: $(npm -v)"

# ── 3. PM2 ────────────────────────────────────────────────────────────────────
npm install -g pm2
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

# ── 4. Firewall ───────────────────────────────────────────────────────────────
ufw allow OpenSSH
ufw allow 'Nginx Full'   # ports 80 + 443
ufw --force enable

# ── 5. Directories ────────────────────────────────────────────────────────────
mkdir -p "$APP_DIR" "$LOG_DIR"
mkdir -p "$APP_DIR/backend/uploads"

# ── 6. Clone repo ─────────────────────────────────────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  echo "Repo already cloned — pulling latest…"
  git -C "$APP_DIR" pull origin main
else
  git clone "$REPO_URL" "$APP_DIR"
fi

# Install backend deps (production only)
cd "$APP_DIR/backend"
npm ci --omit=dev

# Install frontend deps + build
cd "$APP_DIR/frontend"
npm ci

# ── 7. Backend .env ───────────────────────────────────────────────────────────
if [ ! -f "$APP_DIR/backend/.env" ]; then
  echo ""
  echo "──────────────────────────────────────────"
  echo " Enter environment variables for .env"
  echo "──────────────────────────────────────────"

  read -rp "MONGO_URI: " MONGO_URI
  read -rp "JWT_SECRET (leave blank to auto-generate): " JWT_SECRET
  JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
  read -rp "FRONTEND_URL (e.g. http://YOUR_IP or https://yourdomain.com): " FRONTEND_URL
  read -rp "FIREBASE_SERVICE_ACCOUNT_JSON (paste JSON or leave blank): " FIREBASE_JSON

  cat > "$APP_DIR/backend/.env" <<EOF
PORT=5001
NODE_ENV=production
MONGO_URI=${MONGO_URI}
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
FRONTEND_URL=${FRONTEND_URL}
FIREBASE_SERVICE_ACCOUNT_JSON=${FIREBASE_JSON}
EOF
  echo ".env written."
else
  echo ".env already exists — skipping."
fi

# Build frontend (needs VITE_ vars)
read -rp "VITE_GOOGLE_MAPS_KEY (Google Maps API key): " MAPS_KEY
cd "$APP_DIR/frontend"
VITE_GOOGLE_MAPS_KEY="$MAPS_KEY" npm run build

# ── 8. Start backend with PM2 ────────────────────────────────────────────────
cp "$APP_DIR/deploy/ecosystem.config.js" "$APP_DIR/backend/"
cd "$APP_DIR/backend"
pm2 start ecosystem.config.js --env production
pm2 save

# ── 9. Nginx ─────────────────────────────────────────────────────────────────
read -rp "Domain or IP for Nginx server_name (e.g. 123.45.67.89 or app.farmflow.com): " SERVER_NAME

NGINX_CONF="/etc/nginx/sites-available/farmflow"
cp "$APP_DIR/deploy/nginx.conf" "$NGINX_CONF"
sed -i "s/YOUR_DOMAIN_OR_IP/${SERVER_NAME}/g" "$NGINX_CONF"

# Remove default site if it exists
rm -f /etc/nginx/sites-enabled/default

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/farmflow
nginx -t
systemctl reload nginx

echo ""
echo "──────────────────────────────────────────"
echo " Setup complete!"
echo " FarmFlow is running at http://${SERVER_NAME}"
echo ""
echo " Next steps:"
echo "   • Add a domain A record pointing to this IP"
echo "   • Run: certbot --nginx -d yourdomain.com"
echo "     to get a free HTTPS certificate"
echo "   • Check logs: pm2 logs farmflow-backend"
echo "──────────────────────────────────────────"
