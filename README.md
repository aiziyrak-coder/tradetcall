# XAUUSD Oltin Trader (Web)

Real-time XAUUSD monitoring terminal: live price, multi-timeframe chart, drivers, news, long/short strategy, and Claude-powered analysis.

## Quick start (development)

```bash
npm install
cp .env.example .env
# ANTHROPIC_API_KEY ni .env ga qo'ying
npm run dev
```

- Frontend: http://127.0.0.1:5173 (API va WebSocket proxy orqali backend ga ulanadi)
- Backend: http://127.0.0.1:3000

## Production (server)

```bash
npm install
cp .env.example .env
npm run build
npm start
```

Bitta port (default `3000`) — static UI + REST API + WebSocket `/ws`.

### Docker

```bash
docker compose up -d --build
```

## Default users

| Login  | Parol | Rol   |
|--------|-------|-------|
| admin  | admin | admin |
| Lynxos | 3888  | user  |
| Ahror  | 9930  | user  |

Login kichik harfda saqlanadi (`lynxos`, `ahror`). **Productionda parollarni darhol o'zgartiring** (admin panel).

## Environment

| Variable           | Description                          |
|--------------------|--------------------------------------|
| `PORT`             | HTTP port (default 3000)             |
| `SESSION_SECRET`   | Cookie signing secret                |
| `ANTHROPIC_API_KEY`| Server-side AI (required for AI)   |
| `DATA_DIR`         | User store path (default `./data`)   |

## Deploy (VPS + nginx)

Nginx reverse proxy example:

```nginx
server {
    listen 80;
    server_name trade.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable HTTPS with certbot, then set `NODE_ENV=production` and a strong `SESSION_SECRET`.

## Features (web)

- Real-time XAUUSD spot price and chart (1m–1h)
- Long-term and short-term (30 min) strategy panels
- Full news analysis: macro, geopolitics, candle alignment
- WebSocket live updates
- Admin user management
- Server-side Anthropic API (translations, AI forecast, deep news)

## Push to GitHub

```bash
git init
git remote add origin https://github.com/aiziyrak-coder/trade.git
git add .
git commit -m "Web-only XAUUSD trade terminal — production ready"
git push -u origin main
```

## Repository

https://github.com/aiziyrak-coder/trade
