import posthog from "posthog-js";
import { fetchAnalyticsConfig } from "./recommendClient";

let initialized = false;

export const AnalyticsEvent = {
  FlowStarted: "flow_started",
  IntentDepthSelected: "intent_depth_selected",
  IntentAdvancedToggled: "intent_advanced_toggled",
  IntentGenerateClicked: "intent_generate_clicked",
  IntentRegenerateClicked: "intent_regenerate_clicked",
  IntentFeedbackPromptShown: "intent_feedback_prompt_shown",
  IntentFeedbackSubmitted: "intent_feedback_submitted",
  BuildBookmarkCopied: "build_bookmark_copied",
  BuildRetoolClicked: "build_retool_clicked",
  MemorialCreateClicked: "memorial_create_clicked",
  MemorialCreateResult: "memorial_create_result",
  MemorialSubmitted: "memorial_submitted",
  RetoolStarted: "retool_started",
  RerollReasonSelected: "reroll_reason_selected",
  AcceptClicked: "accept_clicked",
  PostAcceptRatingSubmitted: "post_accept_rating_submitted",
  ShareViewed: "share_viewed",
  ShareStatusChanged: "share_status_changed",
  MemoryProfileUpdated: "memory_profile_updated",
  VectorSelected: "vector_selected",
  QuestionAnswered: "question_answered",
  GenerateClicked: "generate_clicked",
  RefineClicked: "refine_clicked",
  CommitClicked: "commit_clicked",
  CommitCompleted: "commit_completed",
  OpsGrowthHealthFailed: "ops_growth_health_failed",
  OpsFeedbackSummaryFailed: "ops_feedback_summary_failed",
} as const;

export async function initAnalytics() {
  if (initialized) return;
  try {
    const cfg = await fetchAnalyticsConfig();
    if (!cfg.posthog.enabled || !cfg.posthog.key) return;
    posthog.init(cfg.posthog.key, {
      api_host: cfg.posthog.host,
      ui_host: cfg.posthog.uiHost,
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      loaded: () => {
        initialized = true;
      },
    });
  } catch {
    // Never block app boot on analytics init.
  }
}

export function trackEvent(event: string, properties: Record<string, unknown> = {}) {
  try {
    posthog.capture(event, properties);
  } catch {
    // Non-blocking analytics.
  }
}
