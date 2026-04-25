import test from "node:test";
import assert from "node:assert/strict";
import { computeRelaxedViability, computeViability } from "./viability";
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

test("relaxed viability ignores stat/prof/vector tags (faction + exclusions only)", () => {
  const input: RecommendInput = {
    entryPath: "draft_a_run",
    signals: {
      statPhilosophy: ["intellect_forward"],
      professionIntents: ["leatherworker_hunter_synergy"],
      buildVectors: ["demonic"],
    },
  };
  const strict = computeViability(input);
  assert.equal(strict.allowedClasses.length, 0);

  const relaxed = computeRelaxedViability(input);
  assert.ok(relaxed.allowedClasses.length > 0);
  assert.ok(relaxed.notes.includes("relaxed_stat_prof_vector_for_ai_sink"));
});
