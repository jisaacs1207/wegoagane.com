import type { AiErrorType, DestinyOutput, MemorialOutput } from "../domain/types";

export type AiTelemetry = {
  enabled: boolean;
  /** Model id sent in the request (e.g. `openrouter/auto`). */
  modelId: string | null;
  /** OpenRouter top-level `model` when the gateway picks a concrete backend (Auto Router). */
  resolvedModelId: string | null;
  latencyMs: number | null;
  retries: number;
  fallbackUsed: boolean;
  providerError: AiErrorType | null;
  inputTokens: number | null;
  outputTokens: number | null;
};

export type DestinyAiResult = {
  output: DestinyOutput;
  validationFailures: string[];
  telemetry: AiTelemetry;
};

export type MemorialAiResult = {
  output: MemorialOutput;
  validationFailures: string[];
  telemetry: AiTelemetry;
};
