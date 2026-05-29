import { parseAiTradeSignalJson } from "../shared/prompts";

const samples = [
  {
    name: "BUY valid",
    json: `{"action":"BUY","entry":2650,"stopLoss":2640,"takeProfit":2670,"confidence":72,"riskReward":2,"analysisUz":"a","triggerUz":"t","invalidationUz":"i","summaryUz":"s"}`,
    price: 2648,
  },
  {
    name: "SELL valid",
    json: `{"action":"SELL","entry":2650,"stopLoss":2660,"takeProfit":2630,"confidence":68,"riskReward":2,"analysisUz":"a","triggerUz":"t","invalidationUz":"i","summaryUz":"s"}`,
    price: 2651,
  },
];

let failed = 0;
for (const s of samples) {
  try {
    const r = parseAiTradeSignalJson(s.json, s.price);
    if (s.name.startsWith("BUY") && r.action !== "BUY") throw new Error("wrong action");
    if (s.name.startsWith("SELL") && r.action !== "SELL") throw new Error("wrong action");
    console.log("✓", s.name);
  } catch (e) {
    console.error("✗", s.name, e instanceof Error ? e.message : e);
    failed++;
  }
}

try {
  parseAiTradeSignalJson(
    `{"action":"BUY","entry":2650,"stopLoss":2660,"takeProfit":2670,"confidence":50,"riskReward":2,"analysisUz":"","triggerUz":"","invalidationUz":"","summaryUz":""}`,
    2650
  );
  console.error("✗ BUY invalid SL should throw");
  failed++;
} catch {
  console.log("✓ BUY invalid SL rejected");
}

if (failed) process.exit(1);
console.log("\nverify-ai-parse OK");
