/** Toshkent vaqti bo'yicha savdo sessiyasi */
export interface MarketSessionInfo {
  nameUz: string;
  active: boolean;
  volatility: "past" | "yuqori" | "o'rta" | "past";
  hintUz: string;
}

export function getMarketSession(): MarketSessionInfo {
  const utc = new Date();
  const hour = (utc.getUTCHours() + 5) % 24; // UTC+5 Toshkent

  if (hour >= 3 && hour < 8) {
    return {
      nameUz: "Osiyo sessiyasi",
      active: true,
      volatility: "o'rta",
      hintUz: "Oltin odatda sokin; kichik diapazon",
    };
  }
  if (hour >= 11 && hour < 16) {
    return {
      nameUz: "London sessiyasi",
      active: true,
      volatility: "yuqori",
      hintUz: "Eng faol vaqt — signal ishonchliligi yuqori",
    };
  }
  if (hour >= 16 && hour < 22) {
    return {
      nameUz: "New York sessiyasi",
      active: true,
      volatility: "yuqori",
      hintUz: "Yuqori hajm — qisqa muddat uchun ideal",
    };
  }
  if (hour >= 22 || hour < 3) {
    return {
      nameUz: "Sokin davr",
      active: false,
      volatility: "past",
      hintUz: "Spread kengayishi mumkin — ehtiyot",
    };
  }
  return {
    nameUz: "London oldi",
    active: true,
    volatility: "o'rta",
    hintUz: "London ochilishiga tayyorlaning",
  };
}
