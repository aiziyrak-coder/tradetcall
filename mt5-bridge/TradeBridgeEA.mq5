//+------------------------------------------------------------------+
//| TradeBridgeEA.mq5 — XAUUSD tick → tradeapi.ziyrak.org              |
//| MT5: Tools → Options → Expert Advisors → WebRequest allow URL     |
//+------------------------------------------------------------------+
#property copyright "Ziyrak Trade"
#property version   "1.00"
#property strict

input string ApiUrl      = "https://tradeapi.ziyrak.org/api/mt5/tick";
input string Mt5Secret   = "";  // server .env MT5_BRIDGE_SECRET bilan bir xil
input int    SendEveryMs = 1000;
input bool   OnlyXau     = true;

datetime g_lastSend = 0;

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
      "{\"symbol\":\"%s\",\"bid\":%.2f,\"ask\":%.2f,\"time\":%d,\"broker\":\"%s\",\"account\":\"%s\"}",
      sym, bid, ask, t, broker, acc
   );

   char post[];
   char result[];
   string headers = "Content-Type: application/json\r\nX-MT5-Secret: " + Mt5Secret + "\r\n";
   StringToCharArray(body, post, 0, WHOLE_ARRAY, CP_UTF8);
   ArrayResize(post, ArraySize(post) - 1);

   string resultHeaders;
   int timeout = 5000;
   int res = WebRequest("POST", ApiUrl, headers, timeout, post, result, resultHeaders);
   if(res == -1)
     {
      Print("WebRequest xato — URL ro'yxatga qo'shing: ", ApiUrl);
      return false;
     }
   return true;
}

void OnTick()
{
   if(GetTickCount() - g_lastSend < (uint)SendEveryMs) return;
   if(PostTick()) g_lastSend = GetTickCount();
}

int OnInit()
{
   Print("TradeBridgeEA: ", ApiUrl);
   if(StringLen(Mt5Secret) < 16)
     {
      Print("MT5_SECRET kiritilmagan (min 16 belgi)");
      return INIT_FAILED;
     }
   EventSetMillisecondTimer(SendEveryMs);
   return INIT_SUCCEEDED;
}

void OnTimer()
{
   PostTick();
}

void OnDeinit(const int reason)
{
   EventKillTimer();
}
