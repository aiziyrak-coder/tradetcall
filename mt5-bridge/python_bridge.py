#!/usr/bin/env python3
"""
MT5 → tradeapi bridge (Windows + MetaTrader5 package).

  pip install MetaTrader5 requests
  set MT5_BRIDGE_SECRET=your-secret-from-server-env
  set TRADE_API_URL=https://tradeapi.ziyrak.org/api/mt5/tick
  python python_bridge.py
"""
import os
import time
import json
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
INTERVAL = float(os.environ.get("MT5_INTERVAL_SEC", "1"))


def main():
    if len(SECRET) < 16:
        print("MT5_BRIDGE_SECRET (min 16) o'rnatilmagan")
        sys.exit(1)
    if not mt5.initialize():
        print("MT5 initialize xato:", mt5.last_error())
        sys.exit(1)

    info = mt5.account_info()
    broker = info.company if info else ""
    print(f"MT5 ulandi: {broker} | {SYMBOL} → {API_URL}")

    while True:
        tick = mt5.symbol_info_tick(SYMBOL)
        if tick is None:
            time.sleep(INTERVAL)
            continue
        payload = {
            "symbol": SYMBOL,
            "bid": round(tick.bid, 2),
            "ask": round(tick.ask, 2),
            "time": int(tick.time),
            "broker": broker,
            "account": str(info.login) if info else "",
        }
        try:
            r = requests.post(
                API_URL,
                json=payload,
                headers={"X-MT5-Secret": SECRET, "Content-Type": "application/json"},
                timeout=5,
            )
            if r.status_code != 200:
                print("API", r.status_code, r.text[:120])
        except Exception as e:
            print("POST xato:", e)
        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
