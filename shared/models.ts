/**
 * OpenAI modellar — YANGI PROGNOZ (eng kuchli birinchi)
 * @see https://platform.openai.com/docs/models
 */
export const OPENAI_MODELS = ["gpt-4o", "gpt-4-turbo", "gpt-4o-mini"] as const;

export const OPENAI_MODEL_PRIMARY = OPENAI_MODELS[0];
export const OPENAI_MODEL_LABEL = "GPT-4o";

/** @deprecated DeepSeek — eski nomlar */
export const DEEPSEEK_MODELS = OPENAI_MODELS;
export const DEEPSEEK_MODEL_PRIMARY = OPENAI_MODEL_PRIMARY;
export const DEEPSEEK_MODEL_LABEL = OPENAI_MODEL_LABEL;
