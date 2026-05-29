import { tv } from "tradingview-api-adapter";

const symbol = process.argv[2] || "FOREXCOM:XAUUSD";
const client = tv();
const sym = client.symbol(symbol);
const stream = sym.stream(["lp", "bid", "ask", "ch", "chp"]);

let n = 0;
for await (const { data } of stream) {
  const bid = data.bid;
  const ask = data.ask;
  const lp = data.lp;
  const mid = bid != null && ask != null ? (bid + ask) / 2 : lp;
  console.log(JSON.stringify({ lp, bid, ask, mid, ch: data.ch, chp: data.chp }));
  if (++n >= 3) break;
}
await client.disconnect();
