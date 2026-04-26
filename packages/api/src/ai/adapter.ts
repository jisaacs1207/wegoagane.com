import type { ApiEnv } from "../db/client";
import type { DestinyOutput, MemorialOutput, RecommendInput } from "../domain/types";
import { validateMemorialOutput, validateTemplateOutput } from "../domain/validator";
import { coerceClassRaceSuggestions } from "../domain/classRaceRules";
import type { AiTelemetry, DestinyAiResult, MemorialAiResult } from "./types";

/** Hard cap on model text before extraction — avoids pathological multi‑MB replies OOMing the worker. */
export const AI_RESPONSE_MAX_CHARS = 450_000;

/** Default completion budget; overridden per call for large artifacts (e.g. build plans). */
const AI_DEFAULT_MAX_TOKENS = 8192;
const AI_MAX_TOKENS_CAP = 100_000;

/** Reusable prompt rails: Classic Era HC scope + strict JSON shape (pairs with `response_format: json_object`). */
export const WOW_HC_JSON_GUARDS = [
  "REALM: World of Warcraft Classic ERA HARDCORE only (level 60 cap, permanent death). Do not use retail, Dragonflight, Season of Discovery–exclusive, TBC-only, or Wrath-only spells, talents, or systems.",
  "OUTPUT: One JSON object only — no markdown, no code fences, no commentary before or after the object. Every string must be valid JSON (escape quotes and newlines).",
  "CONCISION: Prefer short fields so the object stays parseable; avoid dumping long guides into a single string.",
  "SSF: If signals.soloSelfFound is true, never recommend Auction House economy, trade buying, or party-only loops; assume gather-and-craft self-found play.",
] as const;

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

const OPENROUTER_AUTO = "openrouter/auto";

/**
 * First top-level `{ ... }` using brace depth (respects `{`/`}` inside JSON strings).
 * Returns null if no balanced object found.
 */
export function extractBalancedJsonObject(s: string): string | null {
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < s.length; i += 1) {
    const c = s[i]!;
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\" && inString) {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === "{") depth += 1;
    else if (c === "}") {
      depth -= 1;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

/** Strips optional ```json fences, clamps size, then extracts the main JSON object for `JSON.parse`. */
export function extractJsonPayload(raw: string): string {
  let s = raw.trim();
  if (s.length > AI_RESPONSE_MAX_CHARS) {
    s = s.slice(0, AI_RESPONSE_MAX_CHARS);
  }
  const fenceIdx = s.search(/```(?:json)?\s*\n?/i);
  if (fenceIdx >= 0) {
    let after = s.slice(fenceIdx).replace(/^```(?:json)?\s*\n?/i, "");
    const endFence = after.indexOf("```");
    if (endFence >= 0) after = after.slice(0, endFence);
    s = after.trim();
  }
  const balanced = extractBalancedJsonObject(s);
  if (balanced) return balanced;
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) return s.slice(start, end + 1);
  return s;
}

function baseTelemetry(modelId: string | null, enabled: boolean): AiTelemetry {
  return {
    enabled,
    modelId,
    resolvedModelId: null,
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

function hashToUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** Drop null/undefined so `{ ...template, ...cleaned }` keeps deterministic template fields. */
function aiOverrideRecord(parsed: unknown): Record<string, unknown> {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const raw = parsed as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v !== null && v !== undefined) out[k] = v;
  }
  return out;
}

export function safeJsonStringify(value: unknown, fallbackLabel: string): string {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ _error: `${fallbackLabel}_not_serializable` });
  }
}

function sanitizeDestinyAiOverrides(template: DestinyOutput, o: Record<string, unknown>): Record<string, unknown> {
  const d = { ...o };
  const bullets = d.bullets;
  if (!Array.isArray(bullets) || bullets.length < 3 || bullets.length > 6 || !bullets.every((b) => typeof b === "string")) {
    delete d.bullets;
  } else {
    const trimmed = bullets.map((b) => (b as string).trim()).filter(Boolean);
    if (trimmed.length < 3 || trimmed.length > 6) delete d.bullets;
    else d.bullets = trimmed;
  }
  for (const key of ["headline", "subline", "tierProse", "rationale", "raceSuggestion"] as const) {
    const v = d[key];
    if (typeof v !== "string" || v.trim().length === 0) delete d[key];
  }
  if (typeof d.factionSuggestion === "string") {
    const f = d.factionSuggestion.trim().toLowerCase();
    if (f !== "horde" && f !== "alliance" && f !== "neutral") delete d.factionSuggestion;
  } else if ("factionSuggestion" in d) {
    delete d.factionSuggestion;
  }
  const gl = d.genderLean;
  if (gl !== "masculine" && gl !== "feminine" && gl !== "neutral") delete d.genderLean;
  return d;
}

function sanitizeMemorialAiOverrides(o: Record<string, unknown>): Record<string, unknown> {
  const d = { ...o };
  delete d.location;
  delete d.cause;
  if (typeof d.epitaph !== "string" || d.epitaph.trim().length === 0) delete d.epitaph;
  if (typeof d.characterName !== "string" || d.characterName.trim().length === 0) delete d.characterName;
  const level = d.level;
  if (level !== null && level !== undefined) {
    if (typeof level !== "number" || !Number.isInteger(level) || level < 1 || level > 60) delete d.level;
  }
  if (typeof d.faction === "string") {
    const f = d.faction.trim().toLowerCase();
    if (f !== "horde" && f !== "alliance" && f !== "neutral") delete d.faction;
  } else if ("faction" in d) {
    delete d.faction;
  }
  return d;
}

async function callGateway(
  env: ApiEnv["Bindings"],
  model: string,
  prompt: string,
  timeoutMs = 6000,
  maxTokens = AI_DEFAULT_MAX_TOKENS,
) {
  const cappedTokens = Math.min(AI_MAX_TOKENS_CAP, Math.max(256, Math.floor(maxTokens)));
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
        max_tokens: cappedTokens,
        // Auto Router picks its own provider; `provider.sort` can fight routing.
        ...(env.AI_PROVIDER_SORT && model !== OPENROUTER_AUTO
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
      model?: string;
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    let content = payload.choices?.[0]?.message?.content;
    if (!content) return { ok: false as const, error: "ai_invalid_json" as const, latencyMs };
    if (content.length > AI_RESPONSE_MAX_CHARS) {
      content = content.slice(0, AI_RESPONSE_MAX_CHARS);
    }
    return {
      ok: true as const,
      content,
      latencyMs,
      inputTokens: payload.usage?.prompt_tokens ?? null,
      outputTokens: payload.usage?.completion_tokens ?? null,
      resolvedModel: typeof payload.model === "string" ? payload.model : undefined,
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

/**
 * OpenRouter-compatible chat completion with JSON mode.
 * @param maxTokens — completion token budget (capped server-side); raise for large artifacts (build plans).
 */
export async function callAiGateway(
  env: ApiEnv["Bindings"],
  model: string,
  prompt: string,
  timeoutMs = 90_000,
  maxTokens?: number,
) {
  return callGateway(env, model, prompt, timeoutMs, maxTokens ?? AI_DEFAULT_MAX_TOKENS);
}

export async function enrichDestiny(
  env: ApiEnv["Bindings"],
  input: RecommendInput,
  template: DestinyOutput,
): Promise<DestinyAiResult> {
  const model = env.AI_MODEL_DESTINY ?? OPENROUTER_AUTO;
  const enabled = isAiEnabled(env);
  const telemetry = baseTelemetry(model, enabled);

  const fallback = (): DestinyAiResult => ({
    output: template,
    validationFailures: [],
    telemetry: { ...telemetry, fallbackUsed: true },
  });
  if (!enabled) return fallback();
  const exploreSeed = `${input.sessionId ?? "anon"}|${input.entryPath}|${safeJsonStringify(input.signals, "signals")}`;
  const shouldExploreVariant =
    hashToUnit(exploreSeed) < 0.35 ||
    Boolean(input.signals.nextSignal?.toLowerCase().includes("surprise")) ||
    Boolean(input.signals.intent?.toLowerCase().includes("new"));

  const basePrompt = [
    ...WOW_HC_JSON_GUARDS,
    "Return valid JSON only with keys: headline,subline,classId,raceSuggestion,factionSuggestion,genderLean,tierProse,bullets,rationale,sourceType.",
    "Keep classId unchanged and preserve deterministic selection.",
    `classId=${template.classId}, headline=${template.headline}, subline=${template.subline}`,
    `tierProse=${template.tierProse}, bullets=${template.bullets.join(" | ")}`,
    `rationale=${template.rationale}`,
    `signals=${safeJsonStringify(input.signals, "signals")}`,
    "sourceType must be 'ai'. bullets length must stay 3 to 6. factionSuggestion must be horde/alliance/neutral. genderLean must be masculine/feminine/neutral.",
    "Field budgets: headline <= 80 chars, subline <= 120, tierProse <= 160, rationale <= 400, each bullet <= 160 chars.",
  ];
  const creativePrompt = [
    ...basePrompt,
    "Push novelty: vary title/subline/rationale style while preserving class and safety constraints.",
    "If template archetype feels repetitive for these signals, invent a fresh variation framing.",
  ];
  const sigRaw = safeJsonStringify(input.signals, "signals");
  const signalsLine =
    sigRaw.length > 10_000 ? `${sigRaw.slice(0, 10_000)}\n/* signals JSON truncated for prompt size */` : sigRaw;
  const prompt = (shouldExploreVariant ? creativePrompt : basePrompt)
    .join("\n")
    .replace(`signals=${sigRaw}`, `signals=${signalsLine}`);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await callGateway(env, model, prompt, 75_000, 6144);
    telemetry.retries = attempt;
    telemetry.latencyMs = result.latencyMs;
    if (!result.ok) {
      telemetry.providerError = result.error;
      continue;
    }

    telemetry.inputTokens = result.inputTokens;
    telemetry.outputTokens = result.outputTokens;
    telemetry.resolvedModelId = result.resolvedModel ?? null;
    let overrides: Record<string, unknown>;
    try {
      overrides = sanitizeDestinyAiOverrides(template, aiOverrideRecord(JSON.parse(extractJsonPayload(result.content))));
    } catch {
      telemetry.providerError = "ai_invalid_json";
      continue;
    }

    const candidate: DestinyOutput = {
      ...template,
      ...overrides,
      classId: template.classId,
      genderLean:
        overrides.genderLean === "masculine" ||
        overrides.genderLean === "feminine" ||
        overrides.genderLean === "neutral"
          ? overrides.genderLean
          : template.genderLean,
      sourceType: "ai",
    };
    const fixedIdentity = coerceClassRaceSuggestions({
      classId: template.classId,
      raceSuggestion: candidate.raceSuggestion,
      factionSuggestion: candidate.factionSuggestion,
    });
    candidate.raceSuggestion = fixedIdentity.raceSuggestion;
    candidate.factionSuggestion = fixedIdentity.factionSuggestion;
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
  const model = env.AI_MODEL_MEMORIAL ?? env.AI_MODEL_DESTINY ?? OPENROUTER_AUTO;
  const enabled = isAiEnabled(env);
  const telemetry = baseTelemetry(model, enabled);
  const fallback = (): MemorialAiResult => ({
    output: template,
    validationFailures: [],
    telemetry: { ...telemetry, fallbackUsed: true },
  });
  if (!enabled) return fallback();

  const tmplRaw = JSON.stringify(template);
  const tmpl =
    tmplRaw.length > 8_000 ? `${tmplRaw.slice(0, 8_000)}\n/* template JSON truncated */` : tmplRaw;
  const prompt = [
    ...WOW_HC_JSON_GUARDS,
    "Return valid JSON only with keys: epitaph,characterName,level,location,cause,faction,sourceType.",
    "Preserve location and cause from template. sourceType must be 'ai'.",
    `template=${tmpl}`,
    "Keep tone brief and respectful. Epitaph 8-180 chars.",
  ].join("\n");

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await callGateway(env, model, prompt, 60_000, 3072);
    telemetry.retries = attempt;
    telemetry.latencyMs = result.latencyMs;
    if (!result.ok) {
      telemetry.providerError = result.error;
      continue;
    }
    telemetry.inputTokens = result.inputTokens;
    telemetry.outputTokens = result.outputTokens;
    telemetry.resolvedModelId = result.resolvedModel ?? null;
    let overrides: Record<string, unknown>;
    try {
      overrides = sanitizeMemorialAiOverrides(aiOverrideRecord(JSON.parse(extractJsonPayload(result.content))));
    } catch {
      telemetry.providerError = "ai_invalid_json";
      continue;
    }

    const candidate: MemorialOutput = {
      ...template,
      ...overrides,
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
