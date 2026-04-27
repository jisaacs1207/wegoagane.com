import { describe, expect, it } from "vitest";
import { isBuildPlanInProgressStatus, isBuildPlanTerminalStatus } from "./buildPlanStatus";

describe("build plan status guards", () => {
  it("recognises terminal states", () => {
    expect(isBuildPlanTerminalStatus("ready")).toBe(true);
    expect(isBuildPlanTerminalStatus("failed")).toBe(true);
    expect(isBuildPlanTerminalStatus("queued")).toBe(false);
  });

  it("recognises in-progress states", () => {
    expect(isBuildPlanInProgressStatus("queued")).toBe(true);
    expect(isBuildPlanInProgressStatus("generating")).toBe(true);
    expect(isBuildPlanInProgressStatus("processing")).toBe(false);
  });
});

