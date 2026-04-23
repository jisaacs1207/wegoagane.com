import assert from "node:assert/strict";
import test from "node:test";
import type { ApiEnv } from "../db/client";
import type { DestinyOutput } from "../domain/types";
import { enrichDestiny, extractJsonPayload, isTruthyEnv } from "./adapter";

test("extractJsonPayload strips markdown fences", () => {
  const raw = '```json\n{"a":1}\n```';
  assert.equal(extractJsonPayload(raw), '{"a":1}');
});

test("extractJsonPayload keeps bare JSON", () => {
  assert.equal(extractJsonPayload('{"x":true}'), '{"x":true}');
});

test("extractJsonPayload handles prose before a fence", () => {
  const raw = 'Sure.\n```json\n{"a":2}\n```\n';
  assert.equal(extractJsonPayload(raw), '{"a":2}');
});

test("isTruthyEnv accepts common Cloudflare / dashboard shapes", () => {
  assert.equal(isTruthyEnv("true"), true);
  assert.equal(isTruthyEnv("TRUE"), true);
  assert.equal(isTruthyEnv(true), true);
  assert.equal(isTruthyEnv("1"), true);
  assert.equal(isTruthyEnv("false"), false);
  assert.equal(isTruthyEnv(false), false);
  assert.equal(isTruthyEnv(""), false);
});

test("enrichDestiny falls back to template when AI is disabled", async () => {
  const env = {
    APP_ENV: "test",
    DB: {} as D1Database,
    AI_ENABLED: "false",
  } satisfies ApiEnv["Bindings"];

  const template: DestinyOutput = {
    headline: "Orc Frost Mage",
    subline: "Safe path",
    classId: "mage",
    tierProse: "Safe path · template",
    bullets: ["a", "b", "c"],
    rationale: "Template rationale is still the fallback source.",
    sourceType: "template",
  };

  const result = await enrichDestiny(
    env,
    { entryPath: "release_spirit", signals: {} },
    template,
  );

  assert.deepEqual(result.output, template);
  assert.equal(result.telemetry.fallbackUsed, true);
});
