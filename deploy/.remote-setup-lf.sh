#!/bin/bash
set -euo pipefail

APP_DIR="/opt/trade"
REPO="https://github.com/aiziyrak-coder/trade.git"
FRONTEND_ORIGIN="https://trade.ziyrak.org"
API_PUBLIC="https://tradeapi.ziyrak.org"

export DEBIAN_FRONTEND=noninteractive

echo "==> Paketlar (mavjudlar o'zgarmaydi)"
command -v git >/dev/null || apt-get install -y -qq git
command -v nginx >/dev/null || apt-get install -y -qq nginx
command -v node >/dev/null || {
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
}
command -v python3 >/dev/null || apt-get install -y -qq python3 python3-pip python3-venv

echo "==> Papka: $APP_DIR"
mkdir -p "$APP_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO" "$APP_DIR"
else
  cd "$APP_DIR"
  git fetch origin
  git reset --hard origin/main
  git pull origin main
fi
cd "$APP_DIR"

echo "==> Python venv + Django"
python3 -m venv venv
./venv/bin/pip install -q -r django_auth/requirements.txt gunicorn
export DATA_DIR="$APP_DIR/data"
cd django_auth
../venv/bin/python manage.py migrate --noinput
../venv/bin/python manage.py seed_trade_users
cd ..

echo "==> .env"
SECRET=$(grep -E '^SESSION_SECRET=' .env 2>/dev/null | cut -d= -f2- || openssl rand -hex 32)
cat > .env <<EOF
NODE_ENV=production
PORT=3020
SESSION_SECRET=$SECRET
DJANGO_SECRET_KEY=$SECRET
DATA_DIR=$APP_DIR/data
DJANGO_AUTH_URL=http://127.0.0.1:8020
FRONTEND_ORIGIN=$FRONTEND_ORIGIN
CORS_ORIGINS=$FRONTEND_ORIGIN
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost,tradeapi.ziyrak.org
DJANGO_PUBLIC_ADMIN_URL=$API_PUBLIC/admin/
EOF

echo "==> Node build (VITE_API_BASE=$API_PUBLIC)"
npm ci
export VITE_API_BASE="$API_PUBLIC"
npm run build

echo "==> Systemd (yangi servislar)"
cp deploy/systemd/trade-api.service /etc/systemd/system/
cp deploy/systemd/trade-django.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable trade-django trade-api
systemctl restart trade-django
sleep 2
systemctl restart trade-api

echo "==> Nginx (faqat trade* saytlar)"
cp deploy/nginx-trade.ziyrak.org.conf /etc/nginx/sites-available/trade.ziyrak.org
cp deploy/nginx-tradeapi.ziyrak.org.conf /etc/nginx/sites-available/tradeapi.ziyrak.org
ln -sf /etc/nginx/sites-available/trade.ziyrak.org /etc/nginx/sites-enabled/trade.ziyrak.org
ln -sf /etc/nginx/sites-available/tradeapi.ziyrak.org /etc/nginx/sites-enabled/tradeapi.ziyrak.org
nginx -t
systemctl reload nginx

if command -v certbot >/dev/null; then
  certbot --nginx -d trade.ziyrak.org -d tradeapi.ziyrak.org \
    --non-interactive --agree-tos --register-unsafely-without-email \
    --redirect 2>/dev/null || echo "SSL: certbot keyingi urinish yoki allaqachon mavjud"
fi

echo "==> Tayyor"
systemctl is-active trade-django trade-api nginx
curl -sS -o /dev/null -w "API health: %{http_code}\n" http://127.0.0.1:3020/api/health || true
