#!/usr/bin/env python3
"""
MT5 → tradeapi bridge (Windows + MetaTrader5 package).
Har tick o'zgarganda yuboradi — broker narxi TradingView/MT5 bilan bir xil.

  pip install MetaTrader5 requests
  set MT5_BRIDGE_SECRET=your-secret-from-server-env
  set TRADE_API_URL=https://tradeapi.ziyrak.org/api/mt5/tick
  python python_bridge.py
"""
import os
import time
import sys

try:
    import MetaTrader5 as mt5
    import requests
except ImportError:
    print("pip install MetaTrader5 requests")
    sys.exit(1)

API_URL = os.environ.get("TRADE_API_URL", "https://tradeapi.ziyrak.org/api/mt5/tick")
SECRET = os.environ.get("MT5_BRIDGE_SECRET", "")
SYMBOL = os.environ.get("MT5_SYMBOL", "XAUUSD")
INTERVAL = float(os.environ.get("MT5_INTERVAL_SEC", "0.15"))
HEARTBEAT = float(os.environ.get("MT5_HEARTBEAT_SEC", "2"))


def main():
    if len(SECRET) < 16:
        print("MT5_BRIDGE_SECRET (min 16) o'rnatilmagan")
        sys.exit(1)
    if not mt5.initialize():
        print("MT5 initialize xato:", mt5.last_error())
        sys.exit(1)

    info = mt5.account_info()
    broker = info.company if info else ""
    print(f"MT5 ulandi: {broker} | {SYMBOL} → {API_URL} (interval {INTERVAL}s)")

    last_bid = 0.0
    last_ask = 0.0
    last_send = 0.0
    last_hb = 0.0

    while True:
        tick = mt5.symbol_info_tick(SYMBOL)
        if tick is None:
            time.sleep(INTERVAL)
            continue

        bid = round(tick.bid, 3)
        ask = round(tick.ask, 3)
        now = time.time()
        changed = bid != last_bid or ask != last_ask
        heartbeat = (now - last_hb) >= HEARTBEAT

        if not changed and not heartbeat:
            time.sleep(INTERVAL)
            continue
        if (now - last_send) < INTERVAL and not heartbeat:
            time.sleep(INTERVAL)
            continue

        payload = {
            "symbol": SYMBOL,
            "bid": bid,
            "ask": ask,
            "time": int(tick.time),
            "broker": broker,
            "account": str(info.login) if info else "",
        }
        try:
            r = requests.post(
                API_URL,
                json=payload,
                headers={"X-MT5-Secret": SECRET, "Content-Type": "application/json"},
                timeout=3,
            )
            if r.status_code == 200:
                last_bid, last_ask = bid, ask
                last_send = now
                if heartbeat:
                    last_hb = now
            else:
                print("API", r.status_code, r.text[:120])
        except Exception as e:
            print("POST xato:", e)

        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
