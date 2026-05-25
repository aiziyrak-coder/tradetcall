# MT5 Bridge

Broker narxini serverga yuborish.

## Server `.env`

```env
MT5_BRIDGE_SECRET=uzun-tasodifiy-kalit-min-16-belgi
MT5_STALE_MS=8000
```

## MT5 EA

1. `TradeBridgeEA.mq5` → Experts, compile
2. WebRequest: `https://tradeapi.ziyrak.org`
3. XAUUSD grafikda EA, secret bir xil

MT5 yo'q bo'lsa — Yahoo+spot ishlaydi.
