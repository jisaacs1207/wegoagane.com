#!/usr/bin/env node

const base = process.argv[2] ?? "https://wegoagane.com";

const healthUrl = `${base}/api/health`;
const recommendUrl = `${base}/api/v1/recommend`;

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

  console.log("Smoke OK");
  console.log(`sessionId=${payload.sessionId}`);
  console.log(`destinyId=${payload.destinyId}`);
  console.log(`selectedArchetype=${payload.selectedArchetype}`);
}

run().catch((err) => {
  console.error(String(err));
  process.exit(1);
});
