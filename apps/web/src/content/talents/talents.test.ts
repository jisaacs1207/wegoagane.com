import { describe, expect, it } from "vitest";
import { CLASS_TALENTS, getClassTalents, resolveTalentByName } from "./index";

describe("CLASS_TALENTS catalog", () => {
  it("contains all 9 Classic Era classes", () => {
    expect(Object.keys(CLASS_TALENTS).sort()).toEqual([
      "druid",
      "hunter",
      "mage",
      "paladin",
      "priest",
      "rogue",
      "shaman",
      "warlock",
      "warrior",
    ]);
  });

  it("each class has exactly 3 talent trees", () => {
    for (const data of Object.values(CLASS_TALENTS)) {
      expect(data.trees).toHaveLength(3);
    }
  });

  it("every cell sits within tier 1..7 and column 1..4", () => {
    for (const data of Object.values(CLASS_TALENTS)) {
      for (const tree of data.trees) {
        for (const cell of tree.talents) {
          expect(cell.tier).toBeGreaterThanOrEqual(1);
          expect(cell.tier).toBeLessThanOrEqual(7);
          expect(cell.column).toBeGreaterThanOrEqual(1);
          expect(cell.column).toBeLessThanOrEqual(4);
          expect(cell.maxRank).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it("prereq references resolve to a cell in the same tree", () => {
    for (const data of Object.values(CLASS_TALENTS)) {
      for (const tree of data.trees) {
        const ids = new Set(tree.talents.map((t) => t.id));
        for (const cell of tree.talents) {
          if (cell.prereqId) expect(ids.has(cell.prereqId)).toBe(true);
        }
      }
    }
  });

  it("cell ids are unique within a tree", () => {
    for (const data of Object.values(CLASS_TALENTS)) {
      for (const tree of data.trees) {
        const ids = tree.talents.map((t) => t.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  });
});

describe("resolveTalentByName", () => {
  it("matches case-insensitively", () => {
    const druid = getClassTalents("druid")!;
    const hit = resolveTalentByName(druid, "leader of the pack");
    expect(hit?.cell.id).toBe("feral.leader_of_the_pack");
  });

  it("matches via aliases", () => {
    const druid = getClassTalents("druid")!;
    const hit = resolveTalentByName(druid, "lotp");
    expect(hit?.cell.id).toBe("feral.leader_of_the_pack");
  });

  it("returns null for unknown talents (cross-tree fallback path)", () => {
    const druid = getClassTalents("druid")!;
    expect(resolveTalentByName(druid, "Kazzak's Embrace")).toBeNull();
  });
});
