import type { MonitorSnapshot } from "./types";

export interface AuditCheck {
  id: string;
  labelUz: string;
  ok: boolean;
  detailUz: string;
}

export interface PlatformAuditReport {
  passed: number;
  total: number;
  healthPct: number;
  grade: "excellent" | "good" | "degraded" | "critical";
  gradeUz: string;
  checks: AuditCheck[];
  summaryUz: string;
}

/** Har snapshot uchun runtime audit */
export function auditPlatformSnapshot(snap: MonitorSnapshot): PlatformAuditReport {
  const checks: AuditCheck[] = [];

  checks.push({
    id: "online",
    labelUz: "Server onlayn",
    ok: snap.online === true,
    detailUz: snap.online ? "OK" : "Uzilgan",
  });

  checks.push({
    id: "price",
    labelUz: "Jonli narx",
    ok: !!snap.gold && !snap.priceStale,
    detailUz: snap.gold
      ? `${snap.gold.price} (${snap.gold.feed ?? snap.gold.source})`
      : "Narx yo'q",
  });

  checks.push({
    id: "mt5",
    labelUz: "MT5 ko'prik",
    ok: !!snap.mt5Bridge?.connected && !snap.mt5Bridge?.stale,
    detailUz: snap.mt5Bridge?.connected
      ? snap.mt5Bridge.stale
        ? "Ulangan, tick eskirgan"
        : "Ulangan"
      : "Ulanmagan — Yahoo fallback",
  });

  checks.push({
    id: "short",
    labelUz: "YAQIN strategiya",
    ok: !!snap.shortStrategy?.verdict,
    detailUz: snap.shortStrategy?.verdict?.action ?? "—",
  });

  checks.push({
    id: "long",
    labelUz: "UZOQ strategiya",
    ok: !!snap.strategy?.verdict,
    detailUz: snap.strategy?.verdict?.action ?? "—",
  });

  checks.push({
    id: "news",
    labelUz: "Yangiliklar tahlili",
    ok: !!snap.newsAnalysis && (snap.newsAnalysis.confidence ?? 0) > 0,
    detailUz: snap.newsAnalysis
      ? `${snap.newsAnalysis.overallBias} ${snap.newsAnalysis.confidence}%`
      : "Tayyor emas",
  });

  const newsCount =
    (snap.news?.direct?.length ?? 0) +
    (snap.news?.macro?.length ?? 0) +
    (snap.news?.geopolitics?.length ?? 0);
  checks.push({
    id: "feeds",
    labelUz: "Yangiliklar oqimi",
    ok: newsCount >= 3,
    detailUz: `${newsCount} sarlavha`,
  });

  checks.push({
    id: "chart",
    labelUz: "Grafik shamlar",
    ok: (snap.chart?.candles?.length ?? 0) >= 20,
    detailUz: `${snap.chart?.candles?.length ?? 0} ta`,
  });

  checks.push({
    id: "calendar",
    labelUz: "Makro kalendar",
    ok: !!snap.calendar,
    detailUz: snap.calendar?.inHighImpactWindow
      ? "Yuqori ta'sir oynasi"
      : "Normal",
  });

  checks.push({
    id: "platform",
    labelUz: "Platform intellekt",
    ok: !!snap.platform,
    detailUz: snap.platform ? "Faol" : "Yuklanmoqda",
  });

  const passed = checks.filter((c) => c.ok).length;
  const total = checks.length;
  const healthPct = Math.round((passed / total) * 100);

  let grade: PlatformAuditReport["grade"] = "excellent";
  if (healthPct < 50) grade = "critical";
  else if (healthPct < 70) grade = "degraded";
  else if (healthPct < 90) grade = "good";

  const gradeUz =
    grade === "excellent"
      ? "A'lo"
      : grade === "good"
        ? "Yaxshi"
        : grade === "degraded"
          ? "Pasaygan"
          : "Kritik";

  const summaryUz =
    healthPct >= 90
      ? `Platforma ${healthPct}% sog'lom — professional rejimda ishlayapti.`
      : healthPct >= 70
        ? `Platforma ${healthPct}% — ba'zi komponentlar kuchsiz, ehtiyot bilan savdo qiling.`
        : `Platforma ${healthPct}% — ${total - passed} muammo. Avval infratuzilmani tuzating.`;

  return { passed, total, healthPct, grade, gradeUz, checks, summaryUz };
}
