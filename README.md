# XAUUSD Trade Terminal

Web terminal — long/short strategiya, yangiliklar tahlili, Django auth.

## Loginlar

| Login | Parol | Rol |
|-------|-------|-----|
| Lynxos | 3888 | Admin |
| Ahror | 9930 | User |

Yangi foydalanuvchi: Django Admin (`/admin/` on API domain).

## Local

```bash
pip install -r django_auth/requirements.txt
npm install
npm run setup:django
npm run dev
```

## Production

- Frontend: https://trade.ziyrak.org
- API: https://tradeapi.ziyrak.org
- Server: `/opt/trade`, ports `3010` (Node), `8010` (Django)

```bash
DEPLOY_PASS='***' node scripts/deploy-production.mjs
```
