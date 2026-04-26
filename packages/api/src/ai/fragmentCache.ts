import { eq } from "drizzle-orm";
import { aiFragmentCache } from "../db/schema";
import { getDb, type ApiEnv } from "../db/client";
import { stripFancyPunctuation } from "./punctuation";

/**
 * AI fragment cache: keyed by (kind, classId, archetypeKey, signalsHash).
 *
 * The same canonical signal hash + class + archetype can reuse a previously-validated AI payload
 * (destiny enrichment, build plan, name pack), letting us serve repeat visitors without burning a
 * model call. The cache stores POST-sanitisation payloads (no fancy punctuation, schema-validated).
 *
 * Versioning:
 * - Bump `FRAGMENT_VERSION_*` when schema or sanitiser shape changes; old rows are filtered on read.
 * - `kind` namespaces concurrent migrations so we don't have to nuke the whole table.
 */

export type FragmentKind = "destiny_enrichment" | "build_plan" | "name_pack";

/** Bump these when the persisted shape changes for a given kind. */
export const FRAGMENT_VERSIONS: Record<FragmentKind, number> = {
  destiny_enrichment: 1,
  build_plan: 1,
  name_pack: 1,
};

export type FragmentLookup = {
  kind: FragmentKind;
  classId: string | null;
  archetypeKey: string | null;
  signalsHash: string;
};

/**
 * Build the canonical hash for the cache key. We pick only signals that materially change AI output
 * so users with cosmetically different sessions still hit the cache. Synchronous fallback for
 * non-Node environments (Cloudflare Workers expose `crypto.subtle` async only).
 */
export async function hashSignalsForCache(signalsCanonical: unknown): Promise<string> {
  const json = canonicalStringify(signalsCanonical);
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = new TextEncoder().encode(json);
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return bufferToHex(digest);
  }
  // Last-resort cheap hash. Should never run in prod (Workers always have subtle).
  let hash = 5381;
  for (let i = 0; i < json.length; i += 1) hash = ((hash << 5) + hash + json.charCodeAt(i)) | 0;
  return `fnv${(hash >>> 0).toString(16)}`;
}

function bufferToHex(buf: ArrayBuffer): string {
  const view = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < view.length; i += 1) out += view[i]!.toString(16).padStart(2, "0");
  return out;
}

/** Stable JSON.stringify with sorted keys so `{a:1,b:2}` and `{b:2,a:1}` hash identically. */
function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map((v) => canonicalStringify(v)).join(",")}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const parts = keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify((value as Record<string, unknown>)[k])}`);
  return `{${parts.join(",")}}`;
}

function makeKey(lookup: FragmentLookup): string {
  return [lookup.kind, lookup.classId ?? "_", lookup.archetypeKey ?? "_", lookup.signalsHash].join("|");
}

/**
 * Look up a cached fragment. Returns the parsed payload or null on miss / version skew.
 * Increments `hit_count` and `last_used_at` on hit so we can prune cold rows later.
 */
export async function getFragment<T>(env: ApiEnv["Bindings"], lookup: FragmentLookup): Promise<T | null> {
  const db = getDb(env.DB);
  const key = makeKey(lookup);
  const row = (await db.select().from(aiFragmentCache).where(eq(aiFragmentCache.key, key)).limit(1))[0];
  if (!row) return null;
  if (row.version !== FRAGMENT_VERSIONS[lookup.kind]) return null;
  let payload: T | null = null;
  try {
    payload = JSON.parse(row.payloadJson) as T;
  } catch {
    return null;
  }
  // Best-effort hit accounting; never block the response on this update.
  try {
    await db
      .update(aiFragmentCache)
      .set({ hitCount: row.hitCount + 1, lastUsedAt: new Date() })
      .where(eq(aiFragmentCache.key, key));
  } catch {
    // Counter writes are advisory; failure is fine.
  }
  return payload;
}

/**
 * Persist a fragment. Idempotent (overwrites prior row at the same key) so re-running with a fixed
 * version simply refreshes the entry. Payload should already be sanitised + schema-validated.
 */
export async function putFragment<T>(env: ApiEnv["Bindings"], lookup: FragmentLookup, payload: T): Promise<void> {
  const db = getDb(env.DB);
  const key = makeKey(lookup);
  const now = new Date();
  const json = stripFancyPunctuation(JSON.stringify(payload));

  // Detect existing row to preserve hit counts on overwrite.
  const existing = (await db.select().from(aiFragmentCache).where(eq(aiFragmentCache.key, key)).limit(1))[0];
  if (existing) {
    await db
      .update(aiFragmentCache)
      .set({
        kind: lookup.kind,
        classId: lookup.classId,
        archetypeKey: lookup.archetypeKey,
        signalsHash: lookup.signalsHash,
        payloadJson: json,
        version: FRAGMENT_VERSIONS[lookup.kind],
        lastUsedAt: now,
      })
      .where(eq(aiFragmentCache.key, key));
    return;
  }
  try {
    await db.insert(aiFragmentCache).values({
      key,
      kind: lookup.kind,
      classId: lookup.classId,
      archetypeKey: lookup.archetypeKey,
      signalsHash: lookup.signalsHash,
      payloadJson: json,
      version: FRAGMENT_VERSIONS[lookup.kind],
      hitCount: 0,
      lastUsedAt: now,
      createdAt: now,
    });
  } catch {
    // Race insert: a concurrent put won; safely ignore.
  }
}

/**
 * Build the canonical signal subset for a destiny enrichment hash. We only include inputs that
 * materially affect AI prose, so cosmetic session differences (sessionId, freeform notes, memory
 * hints) never split the cache.
 */
export function destinyEnrichmentCanonicalSignals(input: {
  classId: string;
  signals: Record<string, unknown>;
}): Record<string, unknown> {
  const s = input.signals ?? {};
  return {
    classId: input.classId,
    intentDepth: s.intentDepth ?? null,
    intent: typeof s.intent === "string" ? s.intent.trim().toLowerCase() : null,
    soloSelfFound: Boolean(s.soloSelfFound),
    factionPreference: s.factionPreference ?? null,
    identityPriority: s.identityPriority ?? null,
    excludedClasses: Array.isArray(s.excludedClasses) ? [...(s.excludedClasses as string[])].sort() : [],
    preferredClass: s.preferredClass ?? null,
    professionPrimaryIntent: (s.professionPrimaryIntent as unknown) ?? null,
    professionSecondaryIntent: (s.professionSecondaryIntent as unknown) ?? null,
    raceIntent: (s.raceIntent as unknown) ?? null,
    nextSignal: typeof s.nextSignal === "string" ? s.nextSignal.trim().toLowerCase() : null,
    mood: typeof s.mood === "string" ? s.mood.trim().toLowerCase() : null,
  };
}

/** Build plan canonical hash extends destiny canonical with archetypeKey + ruleset pin. */
export function buildPlanCanonicalSignals(input: {
  classId: string;
  archetypeKey: string;
  rulesetPin: string;
  signals: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    ...destinyEnrichmentCanonicalSignals(input),
    archetypeKey: input.archetypeKey,
    rulesetPin: input.rulesetPin,
  };
}
