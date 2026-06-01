/**
 * Anthropic modellar — avval eng arzon (Haiku 4.5), keyin Sonnet zaxira.
 */
export const CLAUDE_MODELS = [
  "claude-haiku-4-5-20251001",
  "claude-haiku-4-5",
  "claude-sonnet-4-6",
  "claude-sonnet-4-5-20250929",
] as const;

export const CLAUDE_MODEL_PRIMARY = CLAUDE_MODELS[0];
export const CLAUDE_MODEL_LABEL = "Claude Haiku 4.5 (tejamkor)";
