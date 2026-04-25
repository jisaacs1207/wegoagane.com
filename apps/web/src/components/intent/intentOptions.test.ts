import { describe, expect, it } from "vitest";
import { fillBalancedAssumptions, rollRandomQuickPickSignals, toggleList } from "./intentOptions";

describe("toggleList", () => {
  it("adds id when absent and under max", () => {
    expect(toggleList(undefined, "a", 3)).toEqual(["a"]);
    expect(toggleList(["a"], "b", 3)).toEqual(["a", "b"]);
  });

  it("removes id when present", () => {
    expect(toggleList(["a", "b"], "a", 3)).toEqual(["b"]);
  });

  it("at max length replaces oldest when adding new id", () => {
    expect(toggleList(["a", "b", "c"], "d", 3)).toEqual(["b", "c", "d"]);
  });
});

describe("rollRandomQuickPickSignals", () => {
  it("samples stats, professions, vectors, and race from full catalogs", () => {
    const a = rollRandomQuickPickSignals("seed-a");
    expect(a.statPhilosophy?.length).toBeGreaterThanOrEqual(2);
    expect(a.professionIntents?.length).toBeGreaterThanOrEqual(2);
    expect(a.buildVectors?.length).toBeGreaterThanOrEqual(3);
    expect(a.raceMode).toBeTruthy();
  });
});

describe("fillBalancedAssumptions", () => {
  it("fills only empty dimensions", () => {
    const filled = fillBalancedAssumptions({ statPhilosophy: ["balanced"] });
    expect(filled.statPhilosophy).toEqual(["balanced"]);
    expect(filled.professionIntents?.length).toBeGreaterThan(0);
    expect(filled.buildVectors?.length).toBeGreaterThan(0);
    expect(filled.raceMode).toBe("signal_inferred");
  });
});
