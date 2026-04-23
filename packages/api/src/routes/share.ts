import { type Context, Hono } from "hono";
import { z } from "zod";
import type { ApiEnv } from "../db/client";
import { captureServerEvent } from "../analytics/posthog";
import { AnalyticsEvent } from "../analytics/events";
import { fallbackShareSvg, renderShareSvg, shareImageUrl, type SharePayload, type ShareStatus } from "../domain/share";

const createShareSchema = z.object({
  sessionId: z.string().min(1).max(80),
  destinyId: z.string().min(1).max(80),
  memorialId: z.string().min(1).max(80).optional(),
});

type ShareRow = {
  run_id: string;
  session_id: string;
  destiny_id: string;
  memorial_id: string | null;
  status: ShareStatus;
  r2_key: string | null;
  public_image_url: string | null;
  error: string | null;
  created_at: number;
  updated_at: number;
};

export const shareRouter = new Hono<ApiEnv>();

async function getShareRun(db: D1Database, runId: string): Promise<ShareRow | null> {
  return (await db
    .prepare("SELECT * FROM share_runs WHERE run_id = ?1")
    .bind(runId)
    .first()) as ShareRow | null;
}

async function getExistingByDestiny(
  db: D1Database,
  sessionId: string,
  destinyId: string,
): Promise<ShareRow | null> {
  return (await db
    .prepare("SELECT * FROM share_runs WHERE session_id = ?1 AND destiny_id = ?2 ORDER BY created_at DESC LIMIT 1")
    .bind(sessionId, destinyId)
    .first()) as ShareRow | null;
}

async function buildSharePayload(db: D1Database, destinyId: string, memorialId?: string): Promise<SharePayload> {
  const destiny = (await db
    .prepare("SELECT content_json FROM destinies WHERE id = ?1")
    .bind(destinyId)
    .first()) as { content_json?: string } | null;
  if (!destiny?.content_json) {
    throw new Error("destiny_not_found");
  }
  const parsedDestiny = JSON.parse(destiny.content_json) as SharePayload["destiny"];

  let memorial: SharePayload["memorial"] | undefined;
  if (memorialId) {
    const row = (await db
      .prepare("SELECT content_json FROM memorials WHERE id = ?1")
      .bind(memorialId)
      .first()) as { content_json?: string } | null;
    if (row?.content_json) memorial = JSON.parse(row.content_json) as SharePayload["memorial"];
  } else {
    const row = (await db
      .prepare("SELECT content_json FROM memorials WHERE destiny_id = ?1 ORDER BY created_at DESC LIMIT 1")
      .bind(destinyId)
      .first()) as { content_json?: string } | null;
    if (row?.content_json) memorial = JSON.parse(row.content_json) as SharePayload["memorial"];
  }

  return {
    destiny: {
      headline: parsedDestiny.headline,
      subline: parsedDestiny.subline,
      classId: parsedDestiny.classId,
      tierProse: parsedDestiny.tierProse,
      bullets: parsedDestiny.bullets,
    },
    memorial,
  };
}

async function processShareRun(env: ApiEnv["Bindings"], runId: string): Promise<void> {
  const db = env.DB;
  if (!env.SHARE_IMAGES) {
    await db
      .prepare("UPDATE share_runs SET status = 'failed', error = ?2, updated_at = ?3 WHERE run_id = ?1")
      .bind(runId, "share_images_binding_missing", Date.now())
      .run();
    await captureServerEvent(env, AnalyticsEvent.ShareFailed, runId, {
      runId,
      error: "share_images_binding_missing",
    });
    return;
  }
  const now = Date.now();
  await db
    .prepare("UPDATE share_runs SET status = 'rendering', updated_at = ?2, error = NULL WHERE run_id = ?1")
    .bind(runId, now)
    .run();
  await captureServerEvent(env, AnalyticsEvent.ShareRendering, runId, {
    runId,
    status: "rendering",
  });

  try {
    const run = await getShareRun(db, runId);
    if (!run) throw new Error("share_run_not_found");

    const payload = await buildSharePayload(db, run.destiny_id, run.memorial_id ?? undefined);
    const svg = renderShareSvg(payload);
    const key = `share/${run.run_id}.svg`;
    await env.SHARE_IMAGES.put(key, svg, {
      httpMetadata: {
        contentType: "image/svg+xml; charset=utf-8",
        cacheControl: "public, max-age=31536000, immutable",
      },
    });

    const imageUrl = shareImageUrl(env, runId);
    await db
      .prepare(
        "UPDATE share_runs SET status = 'ready', r2_key = ?2, public_image_url = ?3, updated_at = ?4, error = NULL WHERE run_id = ?1",
      )
      .bind(runId, key, imageUrl, Date.now())
      .run();
    await captureServerEvent(env, AnalyticsEvent.ShareReady, run.session_id, {
      runId,
      destinyId: run.destiny_id,
      status: "ready",
      renderLatencyMs: Date.now() - now,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "share_render_failed";
    await db
      .prepare("UPDATE share_runs SET status = 'failed', error = ?2, updated_at = ?3 WHERE run_id = ?1")
      .bind(runId, message.slice(0, 240), Date.now())
      .run();
    await captureServerEvent(env, AnalyticsEvent.ShareFailed, runId, {
      runId,
      error: message.slice(0, 240),
      renderLatencyMs: Date.now() - now,
    });
  }
}

function asClientResponse(row: ShareRow) {
  return {
    runId: row.run_id,
    sessionId: row.session_id,
    destinyId: row.destiny_id,
    memorialId: row.memorial_id,
    status: row.status,
    imageUrl: row.public_image_url,
    error: row.error,
  };
}

export async function handleCreateShare(c: Context<ApiEnv>) {
  const input = createShareSchema.parse(await c.req.json());
  const existing = await getExistingByDestiny(c.env.DB, input.sessionId, input.destinyId);
  const row = existing;
  if (row) {
    if (row.status === "queued" || row.status === "failed") {
      c.executionCtx.waitUntil(processShareRun(c.env, row.run_id));
    }
    c.executionCtx.waitUntil(
      captureServerEvent(c.env, AnalyticsEvent.ShareStarted, row.session_id, {
        runId: row.run_id,
        destinyId: row.destiny_id,
        status: row.status,
        reused: true,
      }),
    );
    return c.json(asClientResponse(row));
  }

  const runId = crypto.randomUUID();
  const now = Date.now();
  await c.env.DB.prepare(
    "INSERT INTO share_runs (run_id, session_id, destiny_id, memorial_id, status, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, 'queued', ?5, ?5)",
  )
    .bind(runId, input.sessionId, input.destinyId, input.memorialId ?? null, now)
    .run();

  c.executionCtx.waitUntil(processShareRun(c.env, runId));
  const created = await getShareRun(c.env.DB, runId);
  c.executionCtx.waitUntil(
    captureServerEvent(c.env, AnalyticsEvent.ShareStarted, input.sessionId, {
      runId,
      destinyId: input.destinyId,
      memorialId: input.memorialId ?? null,
      status: "queued",
      reused: false,
    }),
  );
  return c.json(asClientResponse(created as ShareRow), 201);
}

export async function handleGetShare(c: Context<ApiEnv>) {
  const runId = c.req.param("runId");
  if (!runId) return c.json({ error: "invalid_run_id" }, 400);
  const row = await getShareRun(c.env.DB, runId);
  if (!row) return c.json({ error: "share_run_not_found" }, 404);
  return c.json(asClientResponse(row));
}

export async function handleGetShareImage(c: Context<ApiEnv>) {
  const runId = c.req.param("runId");
  if (!runId) return c.text("invalid_run_id", 400);
  const row = await getShareRun(c.env.DB, runId);
  if (!row) {
    return new Response(fallbackShareSvg(runId), {
      status: 200,
      headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "public, max-age=60" },
    });
  }
  if (row.status !== "ready" || !row.r2_key) {
    return new Response(fallbackShareSvg(runId), {
      status: 200,
      headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "public, max-age=30" },
    });
  }
  if (!c.env.SHARE_IMAGES) {
    return new Response(fallbackShareSvg(runId), {
      status: 200,
      headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "public, max-age=30" },
    });
  }
  const obj = await c.env.SHARE_IMAGES.get(row.r2_key);
  if (!obj) {
    return new Response(fallbackShareSvg(runId), {
      status: 200,
      headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "public, max-age=30" },
    });
  }
  return new Response(obj.body, {
    status: 200,
    headers: {
      "content-type": obj.httpMetadata?.contentType ?? "image/svg+xml; charset=utf-8",
      "cache-control": obj.httpMetadata?.cacheControl ?? "public, max-age=3600",
    },
  });
}

export async function handleGetShareOg(c: Context<ApiEnv>) {
  const runId = c.req.param("runId");
  if (!runId) return c.text("invalid_run_id", 400);
  const row = await getShareRun(c.env.DB, runId);
  if (!row) return c.text("not found", 404);

  const canonical = `${c.env.SITE_ORIGIN ?? "https://wegoagane.com"}/share/${runId}`;
  const imageUrl = row.public_image_url ?? shareImageUrl(c.env, runId);
  const title = "wegoagane run preview";
  const desc =
    row.status === "ready"
      ? "Memorial + next destiny share card."
      : "Share card is generating. Open to preview the run.";

  const html = `<!doctype html>
<html><head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:url" content="${canonical}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${imageUrl}" />
</head><body>
  <script>location.replace(${JSON.stringify(canonical)});</script>
</body></html>`;
  return c.html(html);
}

export async function handleShareSummary(c: Context<ApiEnv>) {
  const rowsResult = await c.env.DB.prepare(
    "SELECT status, error, created_at, updated_at FROM share_runs ORDER BY created_at DESC LIMIT 200",
  ).all<{
    status: ShareStatus;
    error: string | null;
    created_at: number;
    updated_at: number;
  }>();

  const rows = rowsResult.results ?? [];
  const counts = {
    queued: 0,
    rendering: 0,
    ready: 0,
    failed: 0,
  };
  const latencies: number[] = [];
  for (const row of rows) {
    counts[row.status] += 1;
    if (row.status === "ready") {
      latencies.push(Math.max(0, row.updated_at - row.created_at));
    }
  }
  latencies.sort((a, b) => a - b);
  const avgLatencyMs =
    latencies.length > 0 ? Math.round(latencies.reduce((sum, n) => sum + n, 0) / latencies.length) : null;
  const p95LatencyMs =
    latencies.length > 0 ? latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95))] : null;
  const total = rows.length;
  const failedRate = total > 0 ? Number((counts.failed / total).toFixed(4)) : 0;

  return c.json({
    sampleSize: total,
    counts,
    failedRate,
    avgLatencyMs,
    p95LatencyMs,
  });
}

shareRouter.post("/", handleCreateShare);
shareRouter.get("/summary/health", handleShareSummary);
shareRouter.get("/:runId", handleGetShare);
shareRouter.get("/:runId/image", handleGetShareImage);
shareRouter.get("/:runId/og", handleGetShareOg);
