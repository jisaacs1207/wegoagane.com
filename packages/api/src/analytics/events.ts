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
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];
