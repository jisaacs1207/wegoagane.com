import { and, desc, eq, or } from "drizzle-orm";
import { type Context, Hono } from "hono";
import { z } from "zod";
import { AnalyticsEvent } from "../analytics/events";
import { captureServerEvent } from "../analytics/posthog";
import { getDb, type ApiEnv } from "../db/client";
import { buildCommitFeedback, buildCommits } from "../db/schema";
import { wilsonRatingScore } from "../domain/buildSlug";

export const buildsRouter = new Hono<ApiEnv>();

const rateSchema = z.object({
  sessionId: z.string().min(1).max(120),
  vote: z.enum(["up", "down", "clear"]),
});

type CommitRow = typeof buildCommits.$inferSelect;

async function findBySlug(db: ReturnType<typeof getDb>, slug: string): Promise<CommitRow | null> {
  const row = (
    await db
      .select()
      .from(buildCommits)
      .where(or(eq(buildCommits.slug, slug), eq(buildCommits.destinyId, slug)))
      .limit(1)
  )[0];
  return row ?? null;
}

function summariseCommit(row: CommitRow) {
  let headline = "Saved build";
  let subline = "";
  let classId: string | null = row.classId;
  let archetypeKey: string | null = row.archetypeKey;
  try {
    const card = row.cardJson ? (JSON.parse(row.cardJson) as { headline?: string }) : null;
    if (card?.headline) headline = card.headline;
  } catch {
    // Card payload may be missing in older rows.
  }
  try {
    const payload = row.payloadJson ? (JSON.parse(row.payloadJson) as { destiny?: { headline?: string; subline?: string; classId?: string } }) : null;
    if (payload?.destiny?.headline) headline = payload.destiny.headline;
    if (payload?.destiny?.subline) subline = payload.destiny.subline;
    if (!classId && payload?.destiny?.classId) classId = payload.destiny.classId;
  } catch {
    // Defensive: corrupt payload should not break listings.
  }
  return {
    slug: row.slug,
    path: `/build/commit/${row.slug}`,
    classId,
    archetypeKey,
    commitName: row.commitName,
    headline: row.commitName ?? headline,
    subline,
    thumbsUp: row.thumbsUp,
    thumbsDown: row.thumbsDown,
    ratingScore: row.ratingScore,
    publishedAt: row.publishedAt ? row.publishedAt.getTime?.() ?? row.publishedAt : null,
    createdAt: row.createdAt.getTime?.() ?? row.createdAt,
  };
}

/**
 * `POST /v1/builds/:slug/rate` — one vote per (slug, sessionId). Re-voting the same direction clears
 * the vote (toggle off); voting the opposite direction switches. Auto-publishes drafts on the first
 * recorded vote so "good builds enter listings without a manual save step".
 */
async function handleRate(c: Context<ApiEnv>) {
  const slug = c.req.param("slug");
  if (!slug) return c.json({ error: "invalid_slug" }, 400);
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const parsed = rateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);

  const db = getDb(c.env.DB);
  const row = await findBySlug(db, slug);
  if (!row) return c.json({ error: "build_commit_not_found" }, 404);

  const now = new Date();
  const sessionId = parsed.data.sessionId;
  const requestedVote = parsed.data.vote;

  const existing = (
    await db
      .select()
      .from(buildCommitFeedback)
      .where(and(eq(buildCommitFeedback.buildCommitId, row.id), eq(buildCommitFeedback.sessionId, sessionId)))
      .limit(1)
  )[0];

  let nextVote: "up" | "down" | null;
  if (requestedVote === "clear") {
    nextVote = null;
  } else if (existing?.rating === requestedVote) {
    nextVote = null; // toggle off
  } else {
    nextVote = requestedVote;
  }

  if (existing) {
    if (nextVote === null) {
      await db.delete(buildCommitFeedback).where(eq(buildCommitFeedback.id, existing.id));
    } else {
      await db
        .update(buildCommitFeedback)
        .set({ rating: nextVote, action: "rate", createdAt: now })
        .where(eq(buildCommitFeedback.id, existing.id));
    }
  } else if (nextVote !== null) {
    await db.insert(buildCommitFeedback).values({
      buildCommitId: row.id,
      sessionId,
      rating: nextVote,
      action: "rate",
      note: null,
      createdAt: now,
    });
  }

  // Recompute counts from authoritative table so concurrent votes can't drift the cached counters.
  const upCountRow = await c.env.DB.prepare(
    "SELECT COUNT(*) AS n FROM build_commit_feedback WHERE build_commit_id = ?1 AND rating = 'up'",
  )
    .bind(row.id)
    .first<{ n: number }>();
  const downCountRow = await c.env.DB.prepare(
    "SELECT COUNT(*) AS n FROM build_commit_feedback WHERE build_commit_id = ?1 AND rating = 'down'",
  )
    .bind(row.id)
    .first<{ n: number }>();
  const thumbsUp = Number(upCountRow?.n ?? 0);
  const thumbsDown = Number(downCountRow?.n ?? 0);
  const ratingScore = wilsonRatingScore(thumbsUp, thumbsDown);

  const wasDraft = row.status !== "published";
  const shouldAutoPublish = wasDraft && (thumbsUp + thumbsDown) > 0;

  await db
    .update(buildCommits)
    .set({
      thumbsUp,
      thumbsDown,
      ratingScore,
      status: shouldAutoPublish ? "published" : row.status,
      publishedAt: shouldAutoPublish ? row.publishedAt ?? now : row.publishedAt,
      updatedAt: now,
    })
    .where(eq(buildCommits.id, row.id));

  c.executionCtx.waitUntil(
    captureServerEvent(c.env, AnalyticsEvent.BuildRated, sessionId, {
      slug: row.slug,
      vote: nextVote,
      thumbsUp,
      thumbsDown,
      autoPublished: shouldAutoPublish,
    }),
  );
  if (shouldAutoPublish) {
    c.executionCtx.waitUntil(
      captureServerEvent(c.env, AnalyticsEvent.BuildAutoPublished, sessionId, { slug: row.slug, trigger: "first_vote" }),
    );
  }

  return c.json({
    slug: row.slug,
    yourVote: nextVote,
    thumbsUp,
    thumbsDown,
    ratingScore,
    status: shouldAutoPublish ? "published" : row.status,
  });
}

async function handleMyVote(c: Context<ApiEnv>) {
  const slug = c.req.param("slug");
  const sessionId = c.req.query("sessionId");
  // The shape `{ slug, yourVote, thumbsUp, thumbsDown }` matches the client's BuildRateResponse so a
  // single `RatingBar` reducer covers both fetch + rate. Returning `null` for missing inputs lets
  // the UI render its empty state without a guard.
  if (!slug || !sessionId) return c.json({ slug: slug ?? "", yourVote: null });
  const db = getDb(c.env.DB);
  const row = await findBySlug(db, slug);
  if (!row) return c.json({ slug, yourVote: null });
  const existing = (
    await db
      .select()
      .from(buildCommitFeedback)
      .where(and(eq(buildCommitFeedback.buildCommitId, row.id), eq(buildCommitFeedback.sessionId, sessionId)))
      .limit(1)
  )[0];
  return c.json({
    slug: row.slug,
    yourVote: existing?.rating === "up" || existing?.rating === "down" ? existing.rating : null,
    thumbsUp: row.thumbsUp,
    thumbsDown: row.thumbsDown,
  });
}

async function handleRecent(c: Context<ApiEnv>) {
  const limitRaw = Number(c.req.query("limit") ?? "5");
  const limit = Math.max(1, Math.min(20, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 5));
  const db = getDb(c.env.DB);
  const rows = await db
    .select()
    .from(buildCommits)
    .where(eq(buildCommits.status, "published"))
    .orderBy(desc(buildCommits.publishedAt), desc(buildCommits.createdAt))
    .limit(limit);
  return c.json({ builds: rows.map(summariseCommit) });
}

async function handleTop(c: Context<ApiEnv>) {
  const limitRaw = Number(c.req.query("limit") ?? "5");
  const limit = Math.max(1, Math.min(20, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 5));
  const window = c.req.query("window") ?? "30d";
  const db = getDb(c.env.DB);
  // Window filter applied in raw SQL since drizzle's date math on D1 is awkward.
  let cutoffMs = 0;
  if (window === "30d") cutoffMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
  else if (window === "7d") cutoffMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
  // window === "all" leaves cutoffMs at 0 so every published row qualifies.
  const rowsRes = await c.env.DB.prepare(
    `SELECT * FROM build_commits
     WHERE status = 'published'
       AND (thumbs_up + thumbs_down) > 0
       AND created_at >= ?1
     ORDER BY rating_score DESC, thumbs_up DESC, created_at DESC
     LIMIT ?2`,
  )
    .bind(cutoffMs, limit)
    .all<{
      id: string;
      slug: string;
      session_id: string;
      destiny_id: string;
      build_plan_id: string | null;
      commit_name: string | null;
      payload_json: string;
      card_json: string | null;
      source_type: string;
      status: string;
      published_at: number | null;
      thumbs_up: number;
      thumbs_down: number;
      rating_score: number;
      class_id: string | null;
      archetype_key: string | null;
      created_at: number;
      updated_at: number;
    }>();
  const rows: CommitRow[] = (rowsRes.results ?? []).map((r) => ({
    id: r.id,
    slug: r.slug,
    sessionId: r.session_id,
    destinyId: r.destiny_id,
    buildPlanId: r.build_plan_id,
    commitName: r.commit_name,
    payloadJson: r.payload_json,
    cardJson: r.card_json,
    sourceType: r.source_type,
    status: r.status,
    publishedAt: r.published_at != null ? new Date(r.published_at) : null,
    thumbsUp: r.thumbs_up,
    thumbsDown: r.thumbs_down,
    ratingScore: r.rating_score,
    classId: r.class_id,
    archetypeKey: r.archetype_key,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  }));
  return c.json({ builds: rows.map(summariseCommit), window });
}

// Conservative bot UA detector. We err on "send SSR" because false positives just mean a human gets
// the same metadata + JS-redirect path that bots get. The lowercased substrings cover the vast
// majority of search/social crawlers without needing a full UA database.
const BOT_UA_PATTERNS = [
  "bot",
  "crawl",
  "spider",
  "facebookexternalhit",
  "twitterbot",
  "linkedinbot",
  "discordbot",
  "slackbot",
  "telegrambot",
  "whatsapp",
  "googlebot",
  "bingbot",
  "duckduckbot",
  "yandex",
  "baiduspider",
  "applebot",
  "semrush",
  "ahrefs",
  "embedly",
  "headlesschrome",
  "lighthouse",
];

function isBotRequest(c: Context<ApiEnv>): boolean {
  const ua = (c.req.header("user-agent") ?? "").toLowerCase();
  if (!ua) return true; // No UA -> probably a curl/bot probe; serve SSR.
  return BOT_UA_PATTERNS.some((pat) => ua.includes(pat));
}

/**
 * Server-rendered HTML for `/build/commit/:slug` requests so crawlers see real metadata + a textual
 * body. For human user agents, we proxy the Pages SPA shell and inject the same head tags so the
 * URL is a single round-trip to a fully-rendered page (no client-side redirect bounce).
 *
 * Mirrors the pattern from `share.ts` `handleGetShareOg` — but goes one step further by rewriting
 * the SPA index.html `<head>` instead of redirecting, which avoids an SSR -> SPA loop.
 */
export async function handleCommitOg(c: Context<ApiEnv>) {
  const slug = c.req.param("slug");
  if (!slug) return c.text("invalid_slug", 400);
  const db = getDb(c.env.DB);
  const row = await findBySlug(db, slug);
  if (!row) return c.text("not found", 404);

  const summary = summariseCommit(row);
  const origin = c.env.SITE_ORIGIN ?? "https://wegoagane.com";
  const canonical = `${origin}/build/commit/${row.slug}`;
  const className = summary.classId ? summary.classId.charAt(0).toUpperCase() + summary.classId.slice(1) : "WoW Classic";
  const title = `${summary.headline} - ${className} build - wegoagane`;
  const desc = (summary.subline || `${className} Hardcore build with thumbs ${summary.thumbsUp}/${summary.thumbsDown}`).slice(0, 160);
  const imageUrl = `${origin}/api/v1/share/${row.destinyId}/image`;

  const escape = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  let crawlerBody = `<h1>${escape(summary.headline)}</h1>`;
  if (summary.subline) crawlerBody += `<p>${escape(summary.subline)}</p>`;
  try {
    const payload = row.payloadJson
      ? (JSON.parse(row.payloadJson) as {
          destiny?: { bullets?: string[] };
          plan?: {
            talents?: { keyPicks?: Array<{ tier?: string; name?: string }>; treeAllocations?: Array<{ branch?: string; points?: number }> };
            professions?: { primary?: string; secondary?: string };
            stats?: { priority?: string[] };
            signature?: { whyDistinct?: string; strengths?: string[]; weaknesses?: string[] };
          };
        })
      : null;
    if (payload?.destiny?.bullets?.length) {
      crawlerBody += `<ul>${payload.destiny.bullets.map((b) => `<li>${escape(String(b))}</li>`).join("")}</ul>`;
    }
    if (payload?.plan?.signature?.whyDistinct) {
      crawlerBody += `<p>${escape(payload.plan.signature.whyDistinct)}</p>`;
    }
    if (payload?.plan?.talents?.treeAllocations?.length) {
      crawlerBody += `<h2>Talent allocation</h2><ul>${payload.plan.talents.treeAllocations
        .map((t) => `<li>${escape(String(t.branch ?? ""))}: ${escape(String(t.points ?? 0))} points</li>`)
        .join("")}</ul>`;
    }
    if (payload?.plan?.talents?.keyPicks?.length) {
      crawlerBody += `<h2>Key talents</h2><ul>${payload.plan.talents.keyPicks
        .map((p) => `<li>${escape(String(p.name ?? ""))}${p.tier ? ` (${escape(String(p.tier))})` : ""}</li>`)
        .join("")}</ul>`;
    }
    if (payload?.plan?.professions?.primary || payload?.plan?.professions?.secondary) {
      crawlerBody += `<h2>Professions</h2><p>${escape(String(payload.plan.professions?.primary ?? ""))} / ${escape(String(payload.plan.professions?.secondary ?? ""))}</p>`;
    }
    if (payload?.plan?.stats?.priority?.length) {
      crawlerBody += `<h2>Stats</h2><p>${escape(payload.plan.stats.priority.join(" -> "))}</p>`;
    }
  } catch {
    /* defensive: bad payload still returns the headline */
  }

  const ratingValue = summary.ratingScore > 0 ? Math.max(1, Math.min(5, 1 + summary.ratingScore * 4)) : null;
  const aggregateRating =
    ratingValue !== null && summary.thumbsUp + summary.thumbsDown > 0
      ? `,"aggregateRating":{"@type":"AggregateRating","ratingValue":${ratingValue.toFixed(2)},"bestRating":5,"worstRating":1,"ratingCount":${summary.thumbsUp + summary.thumbsDown}}`
      : "";
  const dateCreatedIso = new Date(row.createdAt.getTime?.() ?? row.createdAt).toISOString();
  const jsonLd = `{"@context":"https://schema.org","@type":"CreativeWork","name":${JSON.stringify(summary.headline)},"description":${JSON.stringify(desc)},"dateCreated":${JSON.stringify(dateCreatedIso)},"url":${JSON.stringify(canonical)}${aggregateRating}}`;

  const headTags = [
    `<title>${escape(title)}</title>`,
    `<meta name="description" content="${escape(desc)}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:title" content="${escape(title)}" />`,
    `<meta property="og:description" content="${escape(desc)}" />`,
    `<meta property="og:image" content="${imageUrl}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escape(title)}" />`,
    `<meta name="twitter:description" content="${escape(desc)}" />`,
    `<meta name="twitter:image" content="${imageUrl}" />`,
    `<script type="application/ld+json">${jsonLd}</script>`,
  ].join("\n  ");

  // Bots / probes get a self-contained HTML doc with all metadata and a textual body. We don't run
  // the SPA for them so the noscript content is the canonical content from their perspective.
  if (isBotRequest(c)) {
    const botHtml = `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${headTags}
</head><body>
  ${crawlerBody}
</body></html>`;
    return c.html(botHtml, 200, {
      "cache-control": "public, max-age=300, s-maxage=900",
    });
  }

  // Human user agents: fetch the Pages SPA shell and rewrite the <head> with our SEO tags. Falls
  // back to a redirect if Pages is unreachable, so the page never errors out.
  try {
    const shellRes = await fetch(`${origin}/index.html`, { cf: { cacheTtl: 60 } as RequestInitCfProperties });
    if (!shellRes.ok) throw new Error(`shell_${shellRes.status}`);
    let shell = await shellRes.text();
    // Drop the existing <title> + meta description so our injected tags win, then splice ours in.
    shell = shell.replace(/<title>[^<]*<\/title>/i, "");
    shell = shell.replace(/<meta\s+name=["']description["'][^>]*>/i, "");
    shell = shell.replace(/<\/head>/i, `  ${headTags}\n</head>`);
    return new Response(shell, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=60, s-maxage=300",
      },
    });
  } catch {
    // If we can't reach Pages, fall back to the bot HTML so the URL still works.
    const fallback = `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${headTags}
</head><body>
  ${crawlerBody}
  <p><a href="${canonical}">Open build</a></p>
</body></html>`;
    return c.html(fallback);
  }
}

/**
 * `GET /sitemap.xml` — every published commit, capped at 50k for sitemap protocol compliance.
 */
export async function handleSitemap(c: Context<ApiEnv>) {
  const origin = c.env.SITE_ORIGIN ?? "https://wegoagane.com";
  const rowsRes = await c.env.DB.prepare(
    "SELECT slug, updated_at FROM build_commits WHERE status = 'published' ORDER BY updated_at DESC LIMIT 50000",
  ).all<{ slug: string; updated_at: number }>();
  const rows = rowsRes.results ?? [];
  const urls = [
    `<url><loc>${origin}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    ...rows.map(
      (r) =>
        `<url><loc>${origin}/build/commit/${r.slug}</loc><lastmod>${new Date(r.updated_at).toISOString()}</lastmod><changefreq>weekly</changefreq></url>`,
    ),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;
  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=600",
    },
  });
}

export async function handleRobots(c: Context<ApiEnv>) {
  const origin = c.env.SITE_ORIGIN ?? "https://wegoagane.com";
  const body = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /ops/

Sitemap: ${origin}/sitemap.xml
`;
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}

buildsRouter.post("/:slug/rate", handleRate);
buildsRouter.get("/:slug/my-vote", handleMyVote);
buildsRouter.get("/recent", handleRecent);
buildsRouter.get("/top", handleTop);
buildsRouter.get("/:slug/og", handleCommitOg);
