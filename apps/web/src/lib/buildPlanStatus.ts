export function isBuildPlanTerminalStatus(status: string | null | undefined): boolean {
  return status === "ready" || status === "failed";
}

export function isBuildPlanInProgressStatus(status: string | null | undefined): boolean {
  return status === "queued" || status === "generating";
}

