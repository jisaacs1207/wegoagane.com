import type { ClassId } from "../icons/types";
import type { DestinyFixture, MemorialFixture } from "../content/cardFixtures";

type EntryPath = "release_spirit" | "draft_a_run" | "lucky_roll";

export type RerollReason = "wrong_class" | "wrong_energy" | "wrong_goals" | "almost_right" | "just_curious";
export type PostAcceptRating = "not_this" | "itll_do" | "good_pick" | "this_is_it" | "perfect";
export type MemoryHints = {
  version: number;
  classAffinity?: Partial<Record<ClassId, number>>;
  rerollReasonCounts?: Partial<Record<RerollReason, number>>;
  confidence?: number;
  updatedAt?: number;
};

type RecommendRequest = {
  sessionId?: string;
  entryPath: EntryPath;
  signals: {
    mood?: string;
    nextSignal?: string;
    intent?: string;
    freeform?: string;
    excludedClasses?: ClassId[];
    preferredClass?: ClassId;
    memoryHints?: MemoryHints;
  };
};

type RecommendResponse = {
  sessionId: string;
  destinyId: string;
  sourceType: "template" | "ai";
  fallbackUsed: boolean;
  output: {
    headline: string;
    subline: string;
    classId: ClassId;
    tierProse: string;
    bullets: string[];
  };
};

type MemorialRequest = {
  sessionId?: string;
  zone: string;
  cause: string;
  mood?: string;
  nextSignal?: string;
  faction?: "horde" | "alliance";
  characterName?: string;
  level?: number;
};

type MemorialResponse = {
  output: {
    epitaph: string;
    characterName: string;
    level: number | null;
    location: string;
    cause: string;
    faction: "horde" | "alliance" | "neutral";
  };
};

export type DestinyResult = {
  sessionId: string;
  destinyId: string;
  sourceType: "template" | "ai";
  fallbackUsed: boolean;
  output: DestinyFixture;
};

type FeedbackChoice = "accept" | "almost_right" | "miss";
type FeedbackStage = "reroll_gate" | "post_accept";

type FeedbackRequest = {
  sessionId: string;
  destinyId: string;
  choice: FeedbackChoice;
  stage?: FeedbackStage;
  rerollReason?: RerollReason;
  postAcceptRating?: PostAcceptRating;
  note?: string;
  rerollFromClassId?: ClassId;
  rerollToClassId?: ClassId;
};

export type FeedbackSummary = {
  total: number;
  rerollsFromAlmostRight: number;
  counts: {
    accept: number;
    almostRight: number;
    miss: number;
  };
  postAcceptRatings: Record<PostAcceptRating, number>;
};

type CreateShareRequest = {
  sessionId: string;
  destinyId: string;
  memorialId?: string;
};

export type ShareRunStatus = "queued" | "rendering" | "ready" | "failed";

export type ShareRunResponse = {
  runId: string;
  sessionId: string;
  destinyId: string;
  memorialId: string | null;
  status: ShareRunStatus;
  imageUrl: string | null;
  error: string | null;
};

export type AnalyticsConfigResponse = {
  posthog: {
    enabled: boolean;
    host: string;
    key: string | null;
    uiHost: string;
  };
  memory: {
    enabled: boolean;
    browserWeight: number;
    serverWeight: number;
    maxBias: number;
    degradeMode: boolean;
    degradeScale: number;
    lookbackLimit: number;
  };
};

export async function fetchDestiny(input: RecommendRequest): Promise<DestinyResult> {
  const response = await fetch("/api/v1/recommend", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`recommend_failed:${response.status}`);
  }

  const data = (await response.json()) as RecommendResponse;
  return {
    sessionId: data.sessionId,
    destinyId: data.destinyId,
    sourceType: data.sourceType,
    fallbackUsed: data.fallbackUsed,
    output: {
      headline: data.output.headline,
      subline: data.output.subline,
      classId: data.output.classId,
      tierProse: data.output.tierProse,
      bullets: data.output.bullets,
    },
  };
}

export async function fetchMemorial(input: MemorialRequest): Promise<MemorialFixture> {
  const response = await fetch("/api/v1/memorial", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`memorial_failed:${response.status}`);
  }

  const data = (await response.json()) as MemorialResponse;
  return {
    epitaph: data.output.epitaph,
    characterName: data.output.characterName,
    level: data.output.level,
    location: data.output.location,
    cause: data.output.cause,
    faction: data.output.faction,
  };
}

export async function submitDestinyFeedback(input: FeedbackRequest): Promise<void> {
  const response = await fetch("/api/v1/feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(`feedback_failed:${response.status}`);
  }
}

export async function fetchFeedbackSummary(): Promise<FeedbackSummary> {
  const response = await fetch("/api/v1/feedback/summary");
  if (!response.ok) {
    throw new Error(`feedback_summary_failed:${response.status}`);
  }
  return (await response.json()) as FeedbackSummary;
}

export async function createShareRun(input: CreateShareRequest): Promise<ShareRunResponse> {
  const response = await fetch("/api/v1/share", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(`share_create_failed:${response.status}`);
  }
  return (await response.json()) as ShareRunResponse;
}

export async function fetchShareRun(runId: string): Promise<ShareRunResponse> {
  const response = await fetch(`/api/v1/share/${runId}`);
  if (!response.ok) {
    throw new Error(`share_status_failed:${response.status}`);
  }
  return (await response.json()) as ShareRunResponse;
}

export async function fetchAnalyticsConfig(): Promise<AnalyticsConfigResponse> {
  const response = await fetch("/api/v1/analytics/config");
  if (!response.ok) {
    throw new Error(`analytics_config_failed:${response.status}`);
  }
  return (await response.json()) as AnalyticsConfigResponse;
}
