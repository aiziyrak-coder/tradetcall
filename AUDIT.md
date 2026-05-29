# Oltin Signal — Production audit

## Avtomatik tekshiruv (54 test)

```bash
npm run audit      # tsc + build + 52 qoida + AI parser
npm run verify:ai  # faqat AI signal validatsiyasi
npm run typecheck
```

Oxirgi holat: **Audit OK — 54/54**

## Arxitektura (2025)

| Qatlam | Vazifa |
|--------|--------|
| **Narx** | TradingView `FOREXCOM:XAUUSD`, mid bid/ask |
| **Bashorat** | `news-intelligence` — hukm, prognoz, xavflar |
| **Indikatorlar** | `marketTechnical` — RSI, ADX, ATR, darajalar |
| **AI signal** | `AI START` → bir martalik Claude → BUY/SELL/HOLD + SL/TP |
| **Himoya** | Kapital/qoidalar/bozor sifati → AI signal HOLD ga tushadi |

Klientga **YAQIN/UZOQ** strategiyalar yuborilmaydi (`attachSession`).

## Tuzatilgan kritik nuqsonlar

| Nuqson | Yechim |
|--------|--------|
| TypeScript: `calendarHint` null | `?? undefined` |
| Har tickda **ikki marta** WebSocket broadcast | Bitta `mergeSnapshot` + bitta `broadcast` |
| Eski strategiyalar UI chalkashligi | Serverdan doim `strategy/shortStrategy: null` |
| AI signal himoyadan o'tmasdi | `applyProfitProtectionToSnapshot` → `aiSignal` HOLD |
| Jurnal noto'g'ri yozilishi | Savdo taqiqda signal yozilmaydi |
| AI JSON noto'g'ri SL/TP | BUY/SELL tartib + min R:R 1.2 |
| Parallel AI START | `analysisInFlight` qulfi |
| AI runner ulanmagan | Aniq xato xabari |
| Push bildirishnoma takrori | `createdAt` bo'yicha dedupe |

## Qo'lda tekshiruv

1. Login → terminal yuklanishi
2. Narx jonli yangilanishi (WebSocket)
3. **AI START** → tahlil → signal paneli
4. **AI STOP** → kutilmoqda holati
5. Sozlamalar → Claude API kalit
6. Yangilik ustiga bosish → havola ochiladi

## Deploy

```bash
# DEPLOY_PASS env kerak
node scripts/deploy-production.mjs
```

Server: `TRADINGVIEW_SYMBOL=FOREXCOM:XAUUSD` (`.env`)
