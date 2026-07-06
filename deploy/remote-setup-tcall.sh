#!/bin/bash
set -euo pipefail

APP_DIR="/opt/tradetcall"
REPO="https://github.com/aiziyrak-coder/tradetcall.git"
FRONTEND_ORIGIN="https://trade.tcall.uz"
API_PUBLIC="https://tradeapi.tcall.uz"
COOKIE_DOMAIN=".tcall.uz"

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
TV_SYM=$(grep -E '^TRADINGVIEW_SYMBOL=' .env 2>/dev/null | cut -d= -f2- || echo "FOREXCOM:XAUUSD")
AI_KEY=$(grep -E '^OPENAI_API_KEY=' .env 2>/dev/null | cut -d= -f2- || grep -E '^DEEPSEEK_API_KEY=' .env 2>/dev/null | cut -d= -f2- || true)
cat > .env <<EOF
NODE_ENV=production
PORT=3070
SESSION_SECRET=$SECRET
DJANGO_SECRET_KEY=$SECRET
DATA_DIR=$APP_DIR/data
DJANGO_AUTH_URL=http://127.0.0.1:8070
FRONTEND_ORIGIN=$FRONTEND_ORIGIN
CORS_ORIGINS=$FRONTEND_ORIGIN
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost,tradeapi.tcall.uz
DJANGO_PUBLIC_ADMIN_URL=$API_PUBLIC/admin/
COOKIE_DOMAIN=$COOKIE_DOMAIN
TRADINGVIEW_SYMBOL=$TV_SYM
EOF
if [ -n "$AI_KEY" ]; then
  echo "OPENAI_API_KEY=$AI_KEY" >> .env
fi

echo "==> Node build (VITE_API_BASE=$API_PUBLIC)"
npm ci
export VITE_API_BASE="$API_PUBLIC"
npm run build

echo "==> Systemd (tradetcall servislar — boshqa servislarga tegmaydi)"
sed "s|/opt/trade|/opt/tradetcall|g" deploy/systemd/trade-api.service > /etc/systemd/system/tradetcall-api.service
sed "s|/opt/trade|/opt/tradetcall|g" deploy/systemd/trade-django.service > /etc/systemd/system/tradetcall-django.service
sed -i 's/Description=XAUUSD Trade API/Description=TradeTCall API/' /etc/systemd/system/tradetcall-api.service
sed -i 's/Description=XAUUSD Trade Auth/Description=TradeTCall Auth/' /etc/systemd/system/tradetcall-django.service
sed -i 's/trade-django.service/tradetcall-django.service/g' /etc/systemd/system/tradetcall-api.service
systemctl daemon-reload
systemctl enable tradetcall-django tradetcall-api
systemctl restart tradetcall-django
sleep 2
systemctl restart tradetcall-api

echo "==> Nginx HTTP (certbot oldin — boshqa saytlarga tegmaydi)"
cp deploy/nginx-trade.tcall.uz.http.conf /etc/nginx/sites-available/trade.tcall.uz
cp deploy/nginx-tradeapi.tcall.uz.http.conf /etc/nginx/sites-available/tradeapi.tcall.uz
ln -sf /etc/nginx/sites-available/trade.tcall.uz /etc/nginx/sites-enabled/trade.tcall.uz
ln -sf /etc/nginx/sites-available/tradeapi.tcall.uz /etc/nginx/sites-enabled/tradeapi.tcall.uz
nginx -t
systemctl reload nginx

if command -v certbot >/dev/null; then
  certbot certonly --webroot -w /var/www/html \
    -d trade.tcall.uz -d tradeapi.tcall.uz \
    --non-interactive --agree-tos --register-unsafely-without-email \
    2>/dev/null || certbot --nginx -d trade.tcall.uz -d tradeapi.tcall.uz \
    --non-interactive --agree-tos --register-unsafely-without-email \
    --redirect 2>/dev/null || echo "SSL: DNS tekshiring — HTTP ishlaydi"
fi

if [ -f /etc/letsencrypt/live/trade.tcall.uz/fullchain.pem ]; then
  echo "==> Nginx HTTPS"
  cp deploy/nginx-trade.tcall.uz.conf /etc/nginx/sites-available/trade.tcall.uz
  cp deploy/nginx-tradeapi.tcall.uz.conf /etc/nginx/sites-available/tradeapi.tcall.uz
  nginx -t
  systemctl reload nginx
else
  echo "==> SSL hali yo'q — HTTP rejimda qoldi (DNS A yozuvlarini tekshiring)"
fi

echo "==> Tayyor"
systemctl is-active tradetcall-django tradetcall-api nginx
curl -sS -o /dev/null -w "API health: %{http_code}\n" http://127.0.0.1:3070/api/health || true
