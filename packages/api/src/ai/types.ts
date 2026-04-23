import type { AiErrorType, DestinyOutput, MemorialOutput } from "../domain/types";

export type AiTelemetry = {
  enabled: boolean;
  modelId: string | null;
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
