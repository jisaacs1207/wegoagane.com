#!/usr/bin/env node

/** Prefer env (CI) so GitHub runners can hit *.workers.dev when wegoagane.com returns 403 at the edge. */
function resolveSmokeBase() {
  const explicit = process.env.API_SMOKE_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const growthHealth = process.env.GROWTH_HEALTH_URL?.trim();
  if (growthHealth) {
    try {
      return new URL(growthHealth).origin.replace(/\/$/, "");
    } catch {
      /* ignore */
    }
  }
  const arg = process.argv[2]?.trim();
  if (arg) return arg.replace(/\/$/, "");
  return "https://wegoagane.com";
}

const base = resolveSmokeBase();
if (process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true") {
  console.log(`smoke base=${base}`);
}

const ua =
  process.env.GITHUB_ACTIONS === "true"
    ? `wegoagane-api-smoke/1 (github-actions; ${process.env.GITHUB_REPOSITORY ?? "unknown"})`
    : "wegoagane-api-smoke/1";

/** @param {string} url @param {RequestInit} [init] */
function smokeFetch(url, init = {}) {
  const headers = new Headers(init.headers ?? undefined);
  if (!headers.has("User-Agent")) headers.set("User-Agent", ua);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  return fetch(url, { ...init, headers });
}

const healthUrl = `${base}/api/health`;
const recommendUrl = `${base}/api/v1/recommend`;
const memorialUrl = `${base}/api/v1/memorial`;
const growthHealthUrl = `${base}/api/v1/growth/health`;
const analyticsConfigUrl = `${base}/api/v1/analytics/config`;
const growthTickProbeUrl = `${base}/api/v1/growth/tick?authProbe=true`;
const growthToken = process.env.GROWTH_CONTROL_TOKEN ?? "";

const body = {
  entryPath: "draft_a_run",
  signals: {
    intent: "Safest path to 60",
    nextSignal: "Safer",
    freeform: "no pet class",
  },
};

async function run() {
  const health = await smokeFetch(healthUrl);
  if (!health.ok) {
    throw new Error(`Health failed (${health.status}) ${healthUrl}`);
  }

  const recommend = await smokeFetch(recommendUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!recommend.ok) {
    const text = await recommend.text();
    throw new Error(`Recommend failed (${recommend.status}) ${recommendUrl}: ${text}`);
  }

  const payload = await recommend.json();
  if (!payload?.destinyId || !payload?.sessionId) {
    throw new Error("Recommend response missing destinyId/sessionId");
  }

  const memorial = await smokeFetch(memorialUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: payload.sessionId,
      zone: "Durotar",
      cause: "Overpull",
      mood: "frustrated",
      nextSignal: "pull smaller",
      faction: "horde",
      characterName: "SmokeRun",
      level: 12,
    }),
  });
  if (!memorial.ok) {
    const text = await memorial.text();
    throw new Error(`Memorial failed (${memorial.status}) ${memorialUrl}: ${text}`);
  }

  const memorialPayload = await memorial.json();
  if (!memorialPayload?.memorialId || !memorialPayload?.output?.epitaph) {
    throw new Error("Memorial response missing memorialId/output");
  }

  const growthHealth = await smokeFetch(growthHealthUrl);
  if (!growthHealth.ok) {
    throw new Error(`Growth health failed (${growthHealth.status}) ${growthHealthUrl}`);
  }
  const growthHealthPayload = await growthHealth.json();
  if (typeof growthHealthPayload?.experimentsRunning !== "number") {
    throw new Error("Growth health missing experimentsRunning");
  }

  const analyticsConfig = await smokeFetch(analyticsConfigUrl);
  if (!analyticsConfig.ok) {
    throw new Error(`Analytics config failed (${analyticsConfig.status}) ${analyticsConfigUrl}`);
  }
  const analyticsPayload = await analyticsConfig.json();
  if (!analyticsPayload?.growth || typeof analyticsPayload.growth.autopilotEnabled !== "boolean") {
    throw new Error("Analytics config missing growth block");
  }

  const tickDenied = await smokeFetch(growthTickProbeUrl, { method: "POST" });
  if (tickDenied.status !== 403) {
    throw new Error(`Growth tick auth expected 403 without token, got ${tickDenied.status}`);
  }

  if (growthToken) {
    const tickAllowed = await smokeFetch(growthTickProbeUrl, {
      method: "POST",
      headers: { "x-growth-control-token": growthToken },
    });
    if (!tickAllowed.ok) {
      const text = await tickAllowed.text();
      throw new Error(`Growth tick auth with token failed (${tickAllowed.status}): ${text}`);
    }
  } else {
    console.warn("GROWTH_CONTROL_TOKEN not set; skipped authenticated growth tick probe");
  }

  console.log("Smoke OK");
  console.log(`sessionId=${payload.sessionId}`);
  console.log(`destinyId=${payload.destinyId}`);
  console.log(`memorialId=${memorialPayload.memorialId}`);
  console.log(`selectedArchetype=${payload.selectedArchetype}`);
  console.log(`growthExperimentsRunning=${growthHealthPayload.experimentsRunning}`);
  console.log(`growthAutopilotEnabled=${analyticsPayload.growth.autopilotEnabled}`);
}

run().catch((err) => {
  console.error(String(err));
  process.exit(1);
});
