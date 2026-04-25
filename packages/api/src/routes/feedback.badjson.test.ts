import assert from "node:assert/strict";
import test from "node:test";
import app from "../index";

const testCtx = {
  waitUntil() {},
  passThroughOnException() {},
  props: {},
} as unknown as ExecutionContext;

const env = {
  APP_ENV: "production",
  DB: {} as D1Database,
} as const;

test("POST /v1/feedback rejects malformed JSON with invalid_json", async () => {
  const res = await app.fetch(
    new Request("http://localhost/v1/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    }),
    env,
    testCtx,
  );
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error?: string };
  assert.equal(body.error, "invalid_json");
});
