import { describe, expect, it } from "vitest";
import { experimentalCohortHit } from "./experimentalLaneOffer";

describe("experimentalCohortHit", () => {
  it("returns false when percent is 0", () => {
    expect(experimentalCohortHit("session-a", 0)).toBe(false);
  });

  it("returns true for all sessions when percent is 100", () => {
    expect(experimentalCohortHit("any-id", 100)).toBe(true);
  });

  it("is stable for the same session id", () => {
    const sid = "stable-session-xyz";
    const a = experimentalCohortHit(sid, 50);
    const b = experimentalCohortHit(sid, 50);
    expect(a).toBe(b);
  });
});
