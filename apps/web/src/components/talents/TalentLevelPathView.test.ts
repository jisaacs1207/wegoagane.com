import { describe, expect, it } from "vitest";
import { deriveLevelTalentSteps } from "../../lib/deriveLevelTalentSteps";

describe("deriveLevelTalentSteps", () => {
  it("prefers levelByLevel over path", () => {
    const steps = deriveLevelTalentSteps(
      [{ level: 12, branch: "Holy", talent: "Divine Fury", rankAfter: 1 }],
      [{ level: 10, branch: "Shadow", talent: "Spirit Tap", rank: 1 }],
    );
    expect(steps).toHaveLength(1);
    expect(steps[0]!.level).toBe(12);
  });

  it("maps path when no levelByLevel", () => {
    const steps = deriveLevelTalentSteps(null, [
      { level: 11, branch: "Shadow", talent: "X", rank: 1 },
      { level: 10, branch: "Shadow", talent: "Y", rank: 1 },
    ]);
    expect(steps.map((s) => s.level)).toEqual([10, 11]);
  });
});
