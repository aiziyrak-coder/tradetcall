# MT5 Bridge — haqiqiy broker narx

Server Linux’da; MT5 faqat **Windows** da ishlaydi. Bridge MT5 dan tick yuboradi, server Yahoo o‘rniga **bid/ask** ishlatadi.

## 1. Server `.env`

```env
MT5_BRIDGE_SECRET=uzun-tasodifiy-kalit-min-16-belgi
MT5_STALE_MS=8000
TRADING_ECONOMICS_API_KEY=...
FINNHUB_API_KEY=...
```

Deploydan keyin `/opt/trade/.env` ga qo‘shing va `systemctl restart trade-api`.

## 2. MT5 — Expert Advisor

1. `TradeBridgeEA.mq5` ni `MQL5/Experts/` ga nusxalang, MetaEditor da compile.
2. **Tools → Options → Expert Advisors** → *Allow WebRequest* — qo‘shing:
   `https://tradeapi.ziyrak.org`
3. XAUUSD (yoki broker symbol) grafikda EA biriktiring.
4. Input: `Mt5Secret` = serverdagi `MT5_BRIDGE_SECRET`.

## 3. Python (ixtiyoriy)

Windows VPS yoki ish stolidagi PC:

```bat
set MT5_BRIDGE_SECRET=...
set TRADE_API_URL=https://tradeapi.ziyrak.org/api/mt5/tick
pip install MetaTrader5 requests
python mt5-bridge/python_bridge.py
```

## 4. Tekshirish

Terminalda **STREAM LIVE** va narx manbasi **MT5 · BrokerName** ko‘rinishi kerak.

`GET /api/mt5/status` (login bilan) yoki snapshot `mt5Bridge.connected: true`.

## Iqtisodiy taqvim

- **Trading Economics** — `TRADING_ECONOMICS_API_KEY` (pullik, aniq)
- **Finnhub** — `FINNHUB_API_KEY` (bepul tier, AQSh calendar)
- Kalitsiz — taxminiy NFP/CPI/FOMC oynalari
