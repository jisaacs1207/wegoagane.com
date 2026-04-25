import { describe, expect, it, beforeEach } from "vitest";
import { SessionKeys } from "./sessionKeys";
import { softenBuildIntentOneSlot } from "./buildIntentRecover";

describe("softenBuildIntentOneSlot", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("removes last build vector first", () => {
    sessionStorage.setItem(
      SessionKeys.plan.buildIntent,
      JSON.stringify({ buildVectors: ["solo", "tank"], statPhilosophy: ["balanced"] }),
    );
    expect(softenBuildIntentOneSlot(SessionKeys.plan.buildIntent)).toBe(true);
    const next = JSON.parse(sessionStorage.getItem(SessionKeys.plan.buildIntent)!) as { buildVectors?: string[] };
    expect(next.buildVectors).toEqual(["solo"]);
  });

  it("then stat philosophy when vectors empty", () => {
    sessionStorage.setItem(SessionKeys.plan.buildIntent, JSON.stringify({ statPhilosophy: ["balanced", "meme_glass"] }));
    expect(softenBuildIntentOneSlot(SessionKeys.plan.buildIntent)).toBe(true);
    const next = JSON.parse(sessionStorage.getItem(SessionKeys.plan.buildIntent)!) as { statPhilosophy?: string[] };
    expect(next.statPhilosophy).toEqual(["balanced"]);
  });

  it("returns false when nothing to soften", () => {
    sessionStorage.setItem(SessionKeys.plan.buildIntent, JSON.stringify({}));
    expect(softenBuildIntentOneSlot(SessionKeys.plan.buildIntent)).toBe(false);
  });
});
