#!/usr/bin/env node

const base = process.argv[2] ?? "https://wegoagane.com";

const healthUrl = `${base}/api/health`;
const recommendUrl = `${base}/api/v1/recommend`;
const memorialUrl = `${base}/api/v1/memorial`;

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

  console.log("Smoke OK");
  console.log(`sessionId=${payload.sessionId}`);
  console.log(`destinyId=${payload.destinyId}`);
  console.log(`memorialId=${memorialPayload.memorialId}`);
  console.log(`selectedArchetype=${payload.selectedArchetype}`);
}

run().catch((err) => {
  console.error(String(err));
  process.exit(1);
});
