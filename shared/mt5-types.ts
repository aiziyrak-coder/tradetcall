/** MT5 bridge — broker tick payload */

export interface Mt5TickPayload {
  symbol: string;
  bid: number;
  ask: number;
  /** Unix seconds */
  time?: number;
  broker?: string;
  account?: string;
}

export interface Mt5BridgeStatus {
  enabled?: boolean;
  connected: boolean;
  stale: boolean;
  lastTickAt: string | null;
  symbol: string | null;
  broker: string | null;
  bid: number | null;
  ask: number | null;
  spread: number | null;
  tickCount: number;
  ageMs: number | null;
  lastError?: string | null;
  setupHintUz?: string | null;
}
