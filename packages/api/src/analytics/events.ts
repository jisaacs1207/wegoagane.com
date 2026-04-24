export const AnalyticsEvent = {
  DestinyGenerated: "destiny_generated",
  DestinyGenerationFailed: "destiny_generation_failed",
  MemorialGenerated: "memorial_generated",
  MemorialGenerationFailed: "memorial_generation_failed",
  FeedbackSubmitted: "feedback_submitted",
  ShareStarted: "share_started",
  ShareRendering: "share_rendering",
  ShareReady: "share_ready",
  ShareFailed: "share_failed",
  ShareViewed: "share_viewed",
  MemoryHealthEvaluated: "memory_health_evaluated",
  GrowthCandidatesGenerated: "growth_candidates_generated",
  GrowthGuardrailEvaluated: "growth_guardrail_evaluated",
  GrowthAssignmentServed: "growth_assignment_served",
  GrowthDecisionMade: "growth_decision_made",
  GrowthHardStopTriggered: "growth_hard_stop_triggered",
  BuildPlanStarted: "build_plan_started",
  BuildPlanReady: "build_plan_ready",
  BuildPlanFailed: "build_plan_failed",
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];
