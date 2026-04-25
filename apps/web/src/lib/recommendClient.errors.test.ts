import { describe, expect, it } from "vitest";
import { destinyRecommendErrorHint, flowApiErrorHint } from "./recommendClient";

describe("destinyRecommendErrorHint", () => {
  it("maps no_viable_build", () => {
    expect(destinyRecommendErrorHint(new Error("recommend_failed:400:no_viable_build"))).toContain("No build matched");
  });

  it("maps 503", () => {
    expect(destinyRecommendErrorHint(new Error("recommend_failed:503:recommend_internal_error"))).toContain("unavailable");
  });
});

describe("flowApiErrorHint", () => {
  it("delegates recommend failures", () => {
    expect(flowApiErrorHint(new Error("recommend_failed:400:no_eligible_archetypes"))).toContain("eligible archetype");
  });

  it("maps journey commit destiny missing", () => {
    expect(flowApiErrorHint(new Error("journey_commit:404:destiny_not_found"))).toContain("session");
  });
});
