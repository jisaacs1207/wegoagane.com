import assert from "node:assert/strict";
import test from "node:test";
import app from "../index";

const baseEnv = {
  APP_ENV: "production",
  DB: {} as D1Database,
  GROWTH_CONTROL_TOKEN: "test-growth-token",
} as const;

const testCtx = {
  waitUntil() {},
  passThroughOnException() {},
  props: {},
} as unknown as ExecutionContext;

test("growth control route returns 403 without token", async () => {
  const res = await app.fetch(
    new Request("http://localhost/v1/growth/tick?authProbe=true", { method: "POST" }),
    baseEnv,
    testCtx,
  );
  assert.equal(res.status, 403);
});

test("growth control route returns 200 with valid token", async () => {
  const req = new Request("http://localhost/v1/growth/tick?authProbe=true", {
    method: "POST",
    headers: { "x-growth-control-token": "test-growth-token" },
  });
  const res = await app.fetch(req, baseEnv, testCtx);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { ok: boolean };
  assert.equal(body.ok, true);
});

test("growth generate route enforces token", async () => {
  const denied = await app.fetch(
    new Request("http://localhost/v1/growth/generate?authProbe=true", { method: "POST" }),
    baseEnv,
    testCtx,
  );
  assert.equal(denied.status, 403);

  const allowed = await app.fetch(
    new Request("http://localhost/v1/growth/generate?authProbe=true", {
      method: "POST",
      headers: { "x-growth-control-token": "test-growth-token" },
    }),
    baseEnv,
    testCtx,
  );
  assert.equal(allowed.status, 200);
});

test("growth promote route enforces token", async () => {
  const denied = await app.fetch(
    new Request("http://localhost/v1/growth/promote?authProbe=true", { method: "POST" }),
    baseEnv,
    testCtx,
  );
  assert.equal(denied.status, 403);

  const allowed = await app.fetch(
    new Request("http://localhost/v1/growth/promote?authProbe=true", {
      method: "POST",
      headers: { "x-growth-control-token": "test-growth-token" },
    }),
    baseEnv,
    testCtx,
  );
  assert.equal(allowed.status, 200);
});
