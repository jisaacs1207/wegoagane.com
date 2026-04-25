import { describe, expect, it } from "vitest";
import { SessionKeys } from "./sessionKeys";

describe("SessionKeys", () => {
  it("keeps stable wire names for browser session continuity", () => {
    expect(SessionKeys.home.sessionId).toBe("session.id");
    expect(SessionKeys.plan.buildIntent).toBe("plan.buildIntent");
    expect(SessionKeys.plan.buildIntentDepth).toBe("plan.buildIntent.depth");
    expect(SessionKeys.death.detailZone).toBe("death.detail.zone");
    expect(SessionKeys.lucky.sessionId).toBe("lucky.sessionId");
  });
});
