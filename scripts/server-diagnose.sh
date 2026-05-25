#!/bin/bash
set -eu
echo "=== services ==="
systemctl is-active trade-api trade-django nginx || true
echo "=== health ==="
curl -sS http://127.0.0.1:3020/api/health || echo FAIL
echo ""
echo "=== node login ==="
curl -sS -X POST http://127.0.0.1:3020/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"lynxos","password":"3888"}' || echo FAIL
echo ""
echo "=== django login ==="
curl -sS -X POST http://127.0.0.1:8020/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"lynxos","password":"3888"}' || echo FAIL
echo ""
echo "=== vite api base in build ==="
grep -oh 'tradeapi[^"]*' /opt/trade/dist-web/assets/*.js 2>/dev/null | head -5 || echo "NOT FOUND - frontend API URL missing!"
echo "=== .env ==="
cat /opt/trade/.env
