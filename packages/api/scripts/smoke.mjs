#!/usr/bin/env node

const base = process.argv[2] ?? "https://wegoagane.com";

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
  const health = await fetch(healthUrl);
  if (!health.ok) {
    throw new Error(`Health failed (${health.status}) ${healthUrl}`);
  }

  const recommend = await fetch(recommendUrl, {
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

  const memorial = await fetch(memorialUrl, {
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

  const growthHealth = await fetch(growthHealthUrl);
  if (!growthHealth.ok) {
    throw new Error(`Growth health failed (${growthHealth.status}) ${growthHealthUrl}`);
  }
  const growthHealthPayload = await growthHealth.json();
  if (typeof growthHealthPayload?.experimentsRunning !== "number") {
    throw new Error("Growth health missing experimentsRunning");
  }

  const analyticsConfig = await fetch(analyticsConfigUrl);
  if (!analyticsConfig.ok) {
    throw new Error(`Analytics config failed (${analyticsConfig.status}) ${analyticsConfigUrl}`);
  }
  const analyticsPayload = await analyticsConfig.json();
  if (!analyticsPayload?.growth || typeof analyticsPayload.growth.autopilotEnabled !== "boolean") {
    throw new Error("Analytics config missing growth block");
  }

  const tickDenied = await fetch(growthTickProbeUrl, { method: "POST" });
  if (tickDenied.status !== 403) {
    throw new Error(`Growth tick auth expected 403 without token, got ${tickDenied.status}`);
  }

  if (growthToken) {
    const tickAllowed = await fetch(growthTickProbeUrl, {
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
