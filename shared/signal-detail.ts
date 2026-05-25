import { getMarketSession } from "./market-session";

export interface SignalCheckItem {
  ok: boolean;
  textUz: string;
}

/** Aniq savdo signali — UI va hisob-kitob */
export interface SignalDetail {
  actionUz: string;
  status: "ready" | "armed" | "wait";
  statusUz: string;
  entryPrice: number;
  entryFrom: number;
  entryTo: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskPoints: number;
  rewardPoints: number;
  riskReward: number;
  distanceToEntry: number;
  distancePct: number;
  inEntryZone: boolean;
  signalStrength: number;
  confluencePct: number;
  sessionUz: string;
  atr: number;
  volatilityUz: string;
  oneLineUz: string;
  checklist: SignalCheckItem[];
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function buildSignalDetail(
  price: number,
  bias: "long" | "short" | "wait",
  entryFrom: number,
  entryTo: number,
  exitPrice: number,
  stopLoss: number,
  takeProfit: number,
  confidence: number,
  confluencePct: number,
  atr: number,
  extraChecks: SignalCheckItem[] = []
): SignalDetail {
  const entryPrice = round2((entryFrom + entryTo) / 2);
  const session = getMarketSession();

  const inEntryZone =
    bias === "long"
      ? price >= entryFrom && price <= entryTo
      : bias === "short"
        ? price >= entryFrom && price <= entryTo
        : false;

  const distanceToEntry =
    bias === "long"
      ? price > entryTo
        ? price - entryTo
        : price < entryFrom
          ? entryFrom - price
          : 0
      : bias === "short"
        ? price < entryFrom
          ? entryFrom - price
          : price > entryTo
            ? price - entryTo
            : 0
        : Math.abs(price - entryPrice);

  const distancePct = price > 0 ? round2((distanceToEntry / price) * 10000) / 100 : 0;

  const riskPoints = round2(Math.abs(entryPrice - stopLoss));
  const rewardPoints = round2(Math.abs(takeProfit - entryPrice));
  const riskReward = riskPoints > 0 ? round2(rewardPoints / riskPoints) : 0;

  let actionUz = "KUTING — SIGNAL YO'Q";
  let status: SignalDetail["status"] = "wait";
  let statusUz = "Hozir kirmang";

  if (bias === "long") {
    actionUz = inEntryZone ? "HOZIR SOTIB OLING" : "SOTIB OLISH — NARX KUTILMOQDA";
    status = inEntryZone ? "ready" : distanceToEntry < atr * 0.5 ? "armed" : "wait";
    statusUz = inEntryZone
      ? "Kirish zonasida — lot oching"
      : status === "armed"
        ? "Narx zonaga yaqin — tayyor turing"
        : `Kutish: $${entryFrom}–$${entryTo}`;
  } else if (bias === "short") {
    actionUz = inEntryZone ? "HOZIR SOTING (SHORT)" : "SOTISH — NARX KUTILMOQDA";
    status = inEntryZone ? "ready" : distanceToEntry < atr * 0.5 ? "armed" : "wait";
    statusUz = inEntryZone
      ? "Kirish zonasida — short oching"
      : status === "armed"
        ? "Narx zonaga yaqin"
        : `Kutish: $${entryFrom}–$${entryTo}`;
  }

  const signalStrength = Math.min(
    98,
    Math.round(
      confidence * 0.45 +
        confluencePct * 0.35 +
        (inEntryZone ? 20 : status === "armed" ? 10 : 0) +
        (session.volatility === "yuqori" ? 8 : 0)
    )
  );

  const volatilityUz =
    atr < price * 0.0008
      ? "Past volatillik"
      : atr > price * 0.002
        ? "Yuqori volatillik — SL keng"
        : "O'rtacha volatillik";

  const checklist: SignalCheckItem[] = [
    {
      ok: bias !== "wait",
      textUz: bias !== "wait" ? "Yo'nalish aniq" : "Yo'nalish yo'q — kuting",
    },
    {
      ok: confluencePct >= 60,
      textUz:
        confluencePct >= 60
          ? `TF moslik ${confluencePct}%`
          : `TF moslik past (${confluencePct}%)`,
    },
    {
      ok: riskReward >= 1.2,
      textUz:
        riskReward >= 1.5
          ? `Risk/Foyda 1:${riskReward} — yaxshi`
          : riskReward >= 1.2
            ? `Risk/Foyda 1:${riskReward} — qabul qilinadi`
            : `Risk/Foyda past 1:${riskReward}`,
    },
    {
      ok: session.active,
      textUz: session.active ? session.nameUz + " faol" : session.nameUz + " — ehtiyot",
    },
    {
      ok: inEntryZone || status === "armed",
      textUz: inEntryZone
        ? "Narx kirish zonasida"
        : `Narxga ${distanceToEntry.toFixed(2)}$ (${distancePct}%)`,
    },
    ...extraChecks,
  ];

  const oneLineUz =
    bias === "wait"
      ? `Kuting — hozir $${price}, aniq zona shakllanmagan`
      : `${actionUz}: kirish $${entryFrom}–$${entryTo}, SL $${stopLoss}, TP $${takeProfit}, R:R 1:${riskReward}`;

  return {
    actionUz,
    status,
    statusUz,
    entryPrice,
    entryFrom: round2(entryFrom),
    entryTo: round2(entryTo),
    exitPrice: round2(exitPrice),
    stopLoss: round2(stopLoss),
    takeProfit: round2(takeProfit),
    riskPoints,
    rewardPoints,
    riskReward,
    distanceToEntry: round2(distanceToEntry),
    distancePct,
    inEntryZone,
    signalStrength,
    confluencePct,
    sessionUz: session.nameUz,
    atr: round2(atr),
    volatilityUz,
    oneLineUz,
    checklist,
  };
}
