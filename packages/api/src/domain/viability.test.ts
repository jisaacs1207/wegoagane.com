import test from "node:test";
import assert from "node:assert/strict";
import { computeViability } from "./viability";
import type { RecommendInput } from "./types";

test("alliance excludes shaman", () => {
  const input: RecommendInput = {
    entryPath: "draft_a_run",
    signals: { factionPreference: "alliance" },
  };
  const v = computeViability(input);
  assert.equal(v.allowedClasses.includes("shaman"), false);
  assert.equal(v.allowedClasses.includes("mage"), true);
});

test("horde excludes paladin", () => {
  const input: RecommendInput = {
    entryPath: "draft_a_run",
    signals: { factionPreference: "horde" },
  };
  const v = computeViability(input);
  assert.equal(v.allowedClasses.includes("paladin"), false);
});

test("leatherworker synergy narrows to leather classes", () => {
  const input: RecommendInput = {
    entryPath: "draft_a_run",
    signals: { professionIntents: ["leatherworker_hunter_synergy"] },
  };
  const v = computeViability(input);
  assert.ok(v.allowedClasses.every((c) => ["hunter", "rogue", "druid"].includes(c)));
});
