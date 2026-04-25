import { and, eq, sql } from "drizzle-orm";
import type { Archetype, ClassId } from "../domain/types";
import { getDb } from "./client";
import { archetypeCandidates, runtimeKv } from "./schema";

export const KV_EXPERIMENTAL_SUPPLEMENT = "experimental_archetype_supplement";
export const KV_EXPERIMENTAL_METRICS = "experimental_archetype_learning_metrics_json";

const CLASS_IDS: ClassId[] = [
  "mage",
  "hunter",
  "warrior",
  "warlock",
  "priest",
  "rogue",
  "druid",
  "paladin",
  "shaman",
];

const TIER_SET = new Set(["safe", "off_beaten", "high_risk", "just_fun"]);

function isClassId(v: string): v is ClassId {
  return CLASS_IDS.includes(v as ClassId);
}

export async function fingerprintArchetypeShape(a: Archetype): Promise<string> {
  const payload = JSON.stringify({
    c: a.classId,
    t: a.title.toLowerCase().trim(),
    s: a.subline.toLowerCase().trim(),
    f: a.first10.map((x) => x.toLowerCase().trim()),
  });
  const buf = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function parseArchetypeJson(raw: string): Archetype | null {
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (typeof o.key !== "string" || typeof o.title !== "string" || typeof o.subline !== "string") return null;
    if (typeof o.classId !== "string" || !isClassId(o.classId)) return null;
    const tier = o.tier;
    if (typeof tier !== "string" || !TIER_SET.has(tier)) return null;
    const faction = o.faction === "horde" || o.faction === "alliance" || o.faction === "either" ? o.faction : null;
    if (!faction) return null;
    const tags = Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === "string") : [];
    const first10 = Array.isArray(o.first10) ? o.first10.filter((t): t is string => typeof t === "string") : [];
    if (typeof o.safetyMechanism !== "string" || first10.length < 3) return null;
    return {
      key: o.key,
      classId: o.classId,
      faction,
      title: o.title,
      subline: o.subline,
      tier: tier as Archetype["tier"],
      tags,
      safetyMechanism: o.safetyMechanism,
      first10,
    };
  } catch {
    return null;
  }
}

export async function fetchRuntimeKvValue(db: D1Database, key: string): Promise<string | null> {
  try {
    const row = await db
      .prepare("SELECT value FROM runtime_kv WHERE key = ?1 LIMIT 1")
      .bind(key)
      .first<{ value: string }>();
    return row?.value ?? null;
  } catch {
    return null;
  }
}

async function upsertRuntimeKv(db: D1Database, key: string, value: string, now = Date.now()): Promise<void> {
  await db
    .prepare(
      `INSERT INTO runtime_kv (key, value, updated_at) VALUES (?1, ?2, ?3)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .bind(key, value, now)
    .run();
}

export function supplementFromExperimentalRates(accepts: number, misses: number): { supplement: string; label: string } {
  const decisions = accepts + misses;
  if (decisions < 8) return { supplement: "", label: "insufficient_sample" };
  const missRate = misses / Math.max(decisions, 1);
  if (missRate > 0.42) {
    return {
      supplement:
        "Recent reroll-gate feedback skewed negative on experimental picks: make first10 bullets ultra-specific Classic HC mechanics (pull cadence, resource windows, consumable rhythm). Avoid generic advice. Keep sublines concrete and under 90 characters.",
      label: "high_miss_rate",
    };
  }
  if (missRate < 0.28) {
    return {
      supplement:
        "Recent experimental archetypes were accepted more often at the reroll gate: keep the same specificity and HC voice; still enforce no slurs, no politics, no RMT.",
      label: "healthy_accept_rate",
    };
  }
  return {
    supplement:
      "Mixed reroll-gate results: prefer one clear safetyMechanism sentence tied to the class, and 4 first10 lines that read like a pull checklist.",
    label: "neutral_blend",
  };
}

export async function runExperimentalLearningTick(db: D1Database): Promise<void> {
  const since = Date.now() - 14 * 24 * 60 * 60 * 1000;
  let accepts = 0;
  let misses = 0;
  try {
    const row = await db
      .prepare(
        `SELECT
          SUM(CASE WHEN f.choice = 'accept' AND f.stage = 'reroll_gate' THEN 1 ELSE 0 END) AS accepts,
          SUM(CASE WHEN f.choice = 'miss' AND f.stage = 'reroll_gate' THEN 1 ELSE 0 END) AS misses
         FROM destiny_feedback f
         INNER JOIN destinies d ON d.id = f.destiny_id
         WHERE d.archetype_key LIKE 'exp_%'
           AND f.created_at >= ?1`,
      )
      .bind(since)
      .first<{ accepts: number | null; misses: number | null }>();
    accepts = Number(row?.accepts ?? 0);
    misses = Number(row?.misses ?? 0);
  } catch {
    return;
  }

  const { supplement, label } = supplementFromExperimentalRates(accepts, misses);
  const now = Date.now();
  try {
    await upsertRuntimeKv(db, KV_EXPERIMENTAL_SUPPLEMENT, supplement, now);
    await upsertRuntimeKv(
      db,
      KV_EXPERIMENTAL_METRICS,
      JSON.stringify({
        windowDays: 14,
        since,
        accepts,
        misses,
        label,
        updatedAt: now,
      }),
      now,
    );
  } catch {
    /* table may not exist on stale workers */
  }
}

export async function loadPromotedArchetypes(db: D1Database, limit = 40): Promise<Archetype[]> {
  let rows: { results?: Array<{ archetype_json: string }> };
  try {
    rows = await db
      .prepare(
        `SELECT archetype_json FROM archetype_candidates
         WHERE status = 'promoted' AND retired_at IS NULL
         ORDER BY promoted_at DESC
         LIMIT ?1`,
      )
      .bind(Math.min(80, Math.max(1, limit)))
      .all<{ archetype_json: string }>();
  } catch {
    return [];
  }
  const out: Archetype[] = [];
  const seen = new Set<string>();
  for (const r of rows.results ?? []) {
    const a = parseArchetypeJson(r.archetype_json);
    if (!a || seen.has(a.key)) continue;
    seen.add(a.key);
    out.push(a);
  }
  return out;
}

export async function recordExperimentalArchetypeCandidate(
  db: D1Database,
  params: {
    archetype: Archetype;
    sessionId: string;
    destinyId: string;
    promptVersionAtGen: string | null;
  },
): Promise<void> {
  const fingerprint = await fingerprintArchetypeShape(params.archetype);
  const now = Date.now();
  const drizzle = getDb(db);
  try {
    await drizzle.insert(archetypeCandidates).values({
      id: crypto.randomUUID(),
      archetypeKey: params.archetype.key,
      classId: params.archetype.classId,
      archetypeJson: JSON.stringify(params.archetype),
      contentFingerprint: fingerprint,
      sessionId: params.sessionId,
      destinyId: params.destinyId,
      status: "candidate",
      acceptCount: 0,
      missCount: 0,
      ratingSum: 0,
      ratingN: 0,
      promptVersionAtGen: params.promptVersionAtGen,
      createdAt: new Date(now),
      promotedAt: null,
      retiredAt: null,
    });
  } catch {
    /* duplicate destiny_id / archetype_key or migration not applied */
  }
}

function ratingNumeric(rating: string | null | undefined): number | null {
  if (!rating) return null;
  const map: Record<string, number> = {
    not_this: 1,
    itll_do: 2,
    good_pick: 4,
    this_is_it: 4.5,
    perfect: 5,
  };
  return map[rating] ?? null;
}

export async function applyArchetypeCandidateFeedback(
  db: D1Database,
  params: {
    destinyId: string;
    choice: "accept" | "almost_right" | "miss";
    stage: string;
    postAcceptRating?: string | null;
  },
): Promise<void> {
  const drizzle = getDb(db);
  let archetypeKey: string | null = null;
  try {
    const d = await db
      .prepare("SELECT archetype_key FROM destinies WHERE id = ?1")
      .bind(params.destinyId)
      .first<{ archetype_key: string }>();
    archetypeKey = d?.archetype_key ?? null;
  } catch {
    return;
  }
  if (!archetypeKey || !archetypeKey.startsWith("exp_")) return;

  try {
    const candidateOnly = and(eq(archetypeCandidates.archetypeKey, archetypeKey), eq(archetypeCandidates.status, "candidate"));

    if (params.stage === "reroll_gate" && params.choice === "accept") {
      await drizzle
        .update(archetypeCandidates)
        .set({ acceptCount: sql`${archetypeCandidates.acceptCount} + 1` })
        .where(candidateOnly);
    }
    if (params.stage === "reroll_gate" && params.choice === "miss") {
      await drizzle
        .update(archetypeCandidates)
        .set({ missCount: sql`${archetypeCandidates.missCount} + 1` })
        .where(candidateOnly);
      const row = await db
        .prepare(
          "SELECT miss_count AS missCount FROM archetype_candidates WHERE archetype_key = ?1 AND status = 'candidate'",
        )
        .bind(archetypeKey)
        .first<{ missCount: number }>();
      if (row && Number(row.missCount) >= 2) {
        await drizzle
          .update(archetypeCandidates)
          .set({ status: "retired", retiredAt: new Date() })
          .where(candidateOnly);
      }
    }
    if (params.stage === "post_accept") {
      const n = ratingNumeric(params.postAcceptRating ?? null);
      if (n != null) {
        await drizzle
          .update(archetypeCandidates)
          .set({
            ratingSum: sql`${archetypeCandidates.ratingSum} + ${n}`,
            ratingN: sql`${archetypeCandidates.ratingN} + 1`,
          })
          .where(candidateOnly);
      }
      const good = params.postAcceptRating === "good_pick" || params.postAcceptRating === "this_is_it" || params.postAcceptRating === "perfect";
      if (good) {
        await drizzle
          .update(archetypeCandidates)
          .set({ status: "promoted", promotedAt: new Date() })
          .where(candidateOnly);
      }
      if (params.postAcceptRating === "not_this") {
        await drizzle
          .update(archetypeCandidates)
          .set({ status: "retired", retiredAt: new Date() })
          .where(eq(archetypeCandidates.archetypeKey, archetypeKey));
      }
    }
  } catch {
    /* non-fatal */
  }
}
