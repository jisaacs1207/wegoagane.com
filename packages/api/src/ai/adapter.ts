import type { ApiEnv } from "../db/client";
import type { DestinyOutput, MemorialOutput, RecommendInput } from "../domain/types";
import { validateMemorialOutput, validateTemplateOutput } from "../domain/validator";
import type { AiTelemetry, DestinyAiResult, MemorialAiResult } from "./types";

/** Cloudflare / Wrangler may supply booleans or strings ("true", "TRUE", "1"). */
export function isTruthyEnv(value: unknown): boolean {
  if (value === true) return true;
  if (value === false || value === null || value === undefined) return false;
  if (typeof value === "number") return value === 1;
  const s = String(value).trim().toLowerCase();
  if (s.length === 0) return false;
  return s === "true" || s === "1" || s === "yes" || s === "on";
}

export function getAiGateStatus(env: ApiEnv["Bindings"]) {
  const aiEnabled = isTruthyEnv(env.AI_ENABLED);
  const hasGatewayUrl = !!env.AI_GATEWAY_URL?.trim();
  const hasGatewayToken = !!env.AI_GATEWAY_TOKEN;
  return {
    aiEnabled,
    hasGatewayUrl,
    hasGatewayToken,
    ready: aiEnabled && hasGatewayUrl && hasGatewayToken,
  };
}

function baseTelemetry(modelId: string | null, enabled: boolean): AiTelemetry {
  return {
    enabled,
    modelId,
    latencyMs: null,
    retries: 0,
    fallbackUsed: false,
    providerError: null,
    inputTokens: null,
    outputTokens: null,
  };
}

function isAiEnabled(env: ApiEnv["Bindings"]) {
  return getAiGateStatus(env).ready;
}

async function callGateway(
  env: ApiEnv["Bindings"],
  model: string,
  prompt: string,
  timeoutMs = 6000,
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();
  try {
    const response = await fetch(env.AI_GATEWAY_URL!, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.AI_GATEWAY_TOKEN}`,
        "HTTP-Referer": env.SITE_ORIGIN ?? "https://wegoagane.com",
        "X-OpenRouter-Title": env.AI_APP_TITLE ?? "wegoagane-api",
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
        ...(env.AI_PROVIDER_SORT
          ? {
              provider: {
                sort: env.AI_PROVIDER_SORT,
              },
            }
          : {}),
      }),
      signal: controller.signal,
    });
    const latencyMs = Date.now() - start;
    if (!response.ok) return { ok: false as const, error: "ai_provider_error" as const, latencyMs };
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return { ok: false as const, error: "ai_invalid_json" as const, latencyMs };
    return {
      ok: true as const,
      content,
      latencyMs,
      inputTokens: payload.usage?.prompt_tokens ?? null,
      outputTokens: payload.usage?.completion_tokens ?? null,
    };
  } catch {
    return {
      ok: false as const,
      error: "ai_timeout" as const,
      latencyMs: Date.now() - start,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function enrichDestiny(
  env: ApiEnv["Bindings"],
  input: RecommendInput,
  template: DestinyOutput,
): Promise<DestinyAiResult> {
  const model = env.AI_MODEL_DESTINY ?? "gpt-4.1-mini";
  const enabled = isAiEnabled(env);
  const telemetry = baseTelemetry(model, enabled);

  const fallback = (): DestinyAiResult => ({
    output: template,
    validationFailures: [],
    telemetry: { ...telemetry, fallbackUsed: true },
  });
  if (!enabled) return fallback();

  const prompt = [
    "Return valid JSON only with keys: headline,subline,classId,tierProse,bullets,rationale,sourceType.",
    "Keep classId unchanged and preserve deterministic selection.",
    `classId=${template.classId}, headline=${template.headline}, subline=${template.subline}`,
    `tierProse=${template.tierProse}, bullets=${template.bullets.join(" | ")}`,
    `rationale=${template.rationale}`,
    `signals=${JSON.stringify(input.signals)}`,
    "sourceType must be 'ai'. bullets length must stay 3 to 6.",
  ].join("\n");

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await callGateway(env, model, prompt);
    telemetry.retries = attempt;
    telemetry.latencyMs = result.latencyMs;
    if (!result.ok) {
      telemetry.providerError = result.error;
      continue;
    }

    telemetry.inputTokens = result.inputTokens;
    telemetry.outputTokens = result.outputTokens;
    let parsed: DestinyOutput;
    try {
      parsed = JSON.parse(result.content) as DestinyOutput;
    } catch {
      telemetry.providerError = "ai_invalid_json";
      continue;
    }

    const candidate: DestinyOutput = {
      ...template,
      ...parsed,
      classId: template.classId,
      sourceType: "ai",
    };
    const failures = validateTemplateOutput(candidate, input.signals.factionPreference);
    if (failures.length === 0) {
      telemetry.fallbackUsed = false;
      telemetry.providerError = null;
      return { output: candidate, validationFailures: [], telemetry };
    }
    telemetry.providerError = "ai_invalid_json";
  }

  return fallback();
}

export async function enrichMemorial(
  env: ApiEnv["Bindings"],
  template: MemorialOutput,
): Promise<MemorialAiResult> {
  const model = env.AI_MODEL_MEMORIAL ?? env.AI_MODEL_DESTINY ?? "gpt-4.1-mini";
  const enabled = isAiEnabled(env);
  const telemetry = baseTelemetry(model, enabled);
  const fallback = (): MemorialAiResult => ({
    output: template,
    validationFailures: [],
    telemetry: { ...telemetry, fallbackUsed: true },
  });
  if (!enabled) return fallback();

  const prompt = [
    "Return valid JSON only with keys: epitaph,characterName,level,location,cause,faction,sourceType.",
    "Preserve location and cause from template. sourceType must be 'ai'.",
    `template=${JSON.stringify(template)}`,
    "Keep tone brief and respectful. Epitaph 8-180 chars.",
  ].join("\n");

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await callGateway(env, model, prompt);
    telemetry.retries = attempt;
    telemetry.latencyMs = result.latencyMs;
    if (!result.ok) {
      telemetry.providerError = result.error;
      continue;
    }
    telemetry.inputTokens = result.inputTokens;
    telemetry.outputTokens = result.outputTokens;
    let parsed: MemorialOutput;
    try {
      parsed = JSON.parse(result.content) as MemorialOutput;
    } catch {
      telemetry.providerError = "ai_invalid_json";
      continue;
    }

    const candidate: MemorialOutput = {
      ...template,
      ...parsed,
      location: template.location,
      cause: template.cause,
      sourceType: "ai",
    };
    const failures = validateMemorialOutput(candidate);
    if (failures.length === 0) {
      telemetry.fallbackUsed = false;
      telemetry.providerError = null;
      return { output: candidate, validationFailures: [], telemetry };
    }
    telemetry.providerError = "ai_invalid_json";
  }
  return fallback();
}
