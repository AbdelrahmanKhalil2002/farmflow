#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# FarmFlow — Deploy / Update Script
# Run on the Droplet to pull latest code and restart services.
# Called automatically by the GitHub Actions deploy workflow, or manually:
#   bash /var/www/farmflow/deploy/deploy.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

APP_DIR="/var/www/farmflow"
cd "$APP_DIR"

echo "[deploy] Pulling latest code…"
git fetch origin main
git reset --hard origin/main

echo "[deploy] Installing backend dependencies…"
cd "$APP_DIR/backend"
npm ci --omit=dev

echo "[deploy] Installing frontend dependencies…"
cd "$APP_DIR/frontend"
npm ci

echo "[deploy] Building frontend…"
# VITE_ vars must be present in the shell or passed here.
# If you stored them in /etc/environment they'll be available automatically.
npm run build

echo "[deploy] Restarting backend…"
cd "$APP_DIR/backend"
pm2 reload ecosystem.config.js --env production --update-env

echo "[deploy] Reloading Nginx…"
nginx -t && systemctl reload nginx

echo "[deploy] Done — $(date)"
