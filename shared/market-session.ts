/** London/NY/Asia sessiyalari — UTC asosida (Toshkent UTC+5) */

export interface MarketSessionInfo {
  nameUz: string;
  active: boolean;
  volatility: "yuqori" | "o'rta" | "past";
  hintUz: string;
  /** Professional savdo uchun eng yaxshi oyna */
  primeWindow: boolean;
  localHourUz: string;
}

export function getMarketSession(now = new Date()): MarketSessionInfo {
  const utcH = now.getUTCHours();
  const utcM = now.getUTCMinutes();
  const tashkentH = (utcH + 5) % 24;
  const localHourUz = `${String(tashkentH).padStart(2, "0")}:${String(utcM).padStart(2, "0")} Toshkent`;

  if (utcH >= 0 && utcH < 7) {
    return {
      nameUz: "Osiyo sessiyasi",
      active: true,
      volatility: "o'rta",
      hintUz: "Tokio/Shanghai — oltin diapazon; breakout kam",
      primeWindow: false,
      localHourUz,
    };
  }
  if (utcH >= 7 && utcH < 12) {
    return {
      nameUz: "London ochilishi",
      active: true,
      volatility: "yuqori",
      hintUz: "London fix vaqtiga yaqin — impuls boshlanishi mumkin",
      primeWindow: utcH >= 8 && utcH < 11,
      localHourUz,
    };
  }
  if (utcH >= 12 && utcH < 17) {
    return {
      nameUz: "London + NY overlap",
      active: true,
      volatility: "yuqori",
      hintUz: "Eng yuqori likvidlik — scalp va swing uchun eng yaxshi",
      primeWindow: true,
      localHourUz,
    };
  }
  if (utcH >= 17 && utcH < 21) {
    return {
      nameUz: "New York sessiyasi",
      active: true,
      volatility: "yuqori",
      hintUz: "AQSh ma'lumotlari — yangiliklar bilan sinxron kuzating",
      primeWindow: utcH >= 17 && utcH < 20,
      localHourUz,
    };
  }
  return {
    nameUz: "Sokin davr (off-hours)",
    active: false,
    volatility: "past",
    hintUz: "Spread kengayishi mumkin — lot ochmang yoki minimal",
    primeWindow: false,
    localHourUz,
  };
}

/** Swing uchun tavsiya etilgan Toshkent vaqti */
export function getSwingSessionWindow(): string {
  const s = getMarketSession();
  if (s.primeWindow) return "13:00 — 22:00 (London/NY overlap, Toshkent)";
  if (s.nameUz.includes("London")) return "12:00 — 18:00 (London, Toshkent)";
  return "13:00 — 21:00 (faol sessiya, Toshkent)";
}
