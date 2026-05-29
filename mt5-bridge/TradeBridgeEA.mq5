//+------------------------------------------------------------------+
//| TradeBridgeEA.mq5 — XAUUSD tick → tradeapi (real-time)            |
//| MT5: Tools → Options → Expert Advisors → WebRequest allow URL     |
//+------------------------------------------------------------------+
#property copyright "Ziyrak Trade"
#property version   "1.10"
#property strict

input string ApiUrl      = "https://tradeapi.ziyrak.org/api/mt5/tick";
input string Mt5Secret   = "";
input int    SendEveryMs = 200;
input int    HeartbeatMs = 2000;
input bool   OnlyXau     = true;

ulong g_lastSend = 0;
ulong g_lastHeartbeat = 0;
double g_lastBid = 0;
double g_lastAsk = 0;

bool PostTick()
{
   if(StringLen(Mt5Secret) < 16) return false;

   string sym = _Symbol;
   if(OnlyXau)
     {
      if(StringFind(sym, "XAU") < 0 && StringFind(sym, "GOLD") < 0)
         return false;
     }

   double bid = SymbolInfoDouble(sym, SYMBOL_BID);
   double ask = SymbolInfoDouble(sym, SYMBOL_ASK);
   if(bid <= 0 || ask <= 0 || ask < bid) return false;

   string broker = AccountInfoString(ACCOUNT_COMPANY);
   string acc    = IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN));
   int    t      = (int)TimeCurrent();

   string body = StringFormat(
      "{\"symbol\":\"%s\",\"bid\":%.3f,\"ask\":%.3f,\"time\":%d,\"broker\":\"%s\",\"account\":\"%s\"}",
      sym, bid, ask, t, broker, acc
   );

   char post[];
   char result[];
   string headers = "Content-Type: application/json\r\nX-MT5-Secret: " + Mt5Secret + "\r\n";
   StringToCharArray(body, post, 0, WHOLE_ARRAY, CP_UTF8);
   ArrayResize(post, ArraySize(post) - 1);

   string resultHeaders;
   int timeout = 3000;
   int res = WebRequest("POST", ApiUrl, headers, timeout, post, result, resultHeaders);
   if(res == -1)
     {
      Print("WebRequest xato — URL ro'yxatga qo'shing: ", ApiUrl);
      return false;
     }
   return true;
}

void TrySend(bool force)
{
   ulong now = GetTickCount();
   string sym = _Symbol;
   double bid = SymbolInfoDouble(sym, SYMBOL_BID);
   double ask = SymbolInfoDouble(sym, SYMBOL_ASK);
   bool changed = (bid != g_lastBid || ask != g_lastAsk);
   bool heartbeat = (now - g_lastHeartbeat >= (ulong)HeartbeatMs);

   if(!force && !changed && !heartbeat) return;
   if(!force && (now - g_lastSend < (ulong)SendEveryMs)) return;

   if(PostTick())
     {
      g_lastSend = now;
      g_lastBid = bid;
      g_lastAsk = ask;
      if(heartbeat || force) g_lastHeartbeat = now;
     }
}

void OnTick()
{
   TrySend(false);
}

int OnInit()
{
   Print("TradeBridgeEA v1.10: ", ApiUrl, " har ", SendEveryMs, "ms");
   if(StringLen(Mt5Secret) < 16)
     {
      Print("MT5_SECRET kiritilmagan (min 16 belgi) — EA to'xtadi");
      return INIT_FAILED;
     }
   EventSetMillisecondTimer(SendEveryMs);
   TrySend(true);
   return INIT_SUCCEEDED;
}

void OnTimer()
{
   TrySend(true);
}

void OnDeinit(const int reason)
{
   EventKillTimer();
}
