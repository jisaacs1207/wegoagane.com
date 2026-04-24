import test from "node:test";
import assert from "node:assert/strict";
import { rankArchetypes } from "./ranker";
import type { Archetype, RecommendInput } from "./types";

const memoryConfig = {
  enabled: true,
  browserWeight: 0.45,
  serverWeight: 0.55,
  maxBias: 1.5,
  degradeMode: false,
  degradeScale: 1,
};

const pool: Archetype[] = [
  {
    key: "a_safe",
    classId: "mage",
    faction: "either",
    title: "A",
    subline: "safe",
    tier: "safe",
    tags: ["safe", "solo"],
    safetyMechanism: "x",
    first10: ["1", "2"],
  },
  {
    key: "b_safe",
    classId: "warrior",
    faction: "either",
    title: "B",
    subline: "safe",
    tier: "safe",
    tags: ["safe", "solo"],
    safetyMechanism: "x",
    first10: ["1", "2"],
  },
  {
    key: "c_horde",
    classId: "shaman",
    faction: "horde",
    title: "C",
    subline: "safe",
    tier: "safe",
    tags: ["safe", "solo"],
    safetyMechanism: "x",
    first10: ["1", "2"],
  },
];

test("recent archetype gets a soft penalty", () => {
  const input: RecommendInput = {
    sessionId: "sess-1",
    entryPath: "draft_a_run",
    signals: { intent: "safe", factionPreference: "alliance" },
  };
  const ranked = rankArchetypes(
    input,
    {
      config: memoryConfig,
      serverMemory: {
        classAffinity: {},
        rerollReasonCounts: {},
        recentArchetypeKeys: ["a_safe"],
        confidence: 0.6,
        sampleSize: 8,
      },
    },
    pool,
  ).ranked;
  assert.equal(ranked[0]?.archetype.key, "b_safe");
});

test("faction constraints are still enforced", () => {
  const input: RecommendInput = {
    sessionId: "sess-2",
    entryPath: "draft_a_run",
    signals: { intent: "safe", factionPreference: "alliance" },
  };
  const ranked = rankArchetypes(input, { config: memoryConfig, serverMemory: { classAffinity: {}, rerollReasonCounts: {}, confidence: 0, sampleSize: 0 } }, pool).ranked;
  assert.equal(ranked.some((r) => r.archetype.key === "c_horde"), false);
});

test("preferred class still dominates", () => {
  const input: RecommendInput = {
    sessionId: "sess-3",
    entryPath: "draft_a_run",
    signals: { intent: "safe", preferredClass: "mage" },
  };
  const ranked = rankArchetypes(
    input,
    {
      config: memoryConfig,
      serverMemory: {
        classAffinity: {},
        rerollReasonCounts: {},
        recentArchetypeKeys: ["a_safe"],
        confidence: 0.8,
        sampleSize: 20,
      },
    },
    pool,
  ).ranked;
  assert.equal(ranked[0]?.archetype.classId, "mage");
});

test("promotes non-recent alternative when scores are close", () => {
  const input: RecommendInput = {
    sessionId: "sess-4",
    entryPath: "draft_a_run",
    signals: { intent: "safe" },
  };
  const ranked = rankArchetypes(
    input,
    {
      config: memoryConfig,
      serverMemory: {
        classAffinity: {},
        rerollReasonCounts: {},
        recentArchetypeKeys: ["a_safe", "a_safe"],
        confidence: 0.7,
        sampleSize: 12,
      },
    },
    pool,
  ).ranked;
  assert.notEqual(ranked[0]?.archetype.key, "a_safe");
});

test("applies hard penalty to heavily repeated archetype", () => {
  const input: RecommendInput = {
    sessionId: "sess-5",
    entryPath: "draft_a_run",
    signals: { intent: "safe" },
  };
  const ranked = rankArchetypes(
    input,
    {
      config: memoryConfig,
      serverMemory: {
        classAffinity: {},
        rerollReasonCounts: {},
        recentArchetypeKeys: ["a_safe", "a_safe", "a_safe"],
        confidence: 0.6,
        sampleSize: 9,
      },
    },
    pool,
  ).ranked;
  assert.notEqual(ranked[0]?.archetype.key, "a_safe");
});

