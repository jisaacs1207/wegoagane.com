import type { ClassId } from "../icons/types";
import type { DestinyFixture, MemorialFixture } from "../content/cardFixtures";
import type { BuildIntentSignals } from "./buildIntentTypes";
import { buildMemoryHints, clearMemoryProfile } from "./memoryProfile";

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

export type RecommendRequest = {
  sessionId?: string;
  entryPath: EntryPath;
  signals: {
    mood?: string;
    nextSignal?: string;
    intent?: string;
    freeform?: string;
    factionPreference?: "horde" | "alliance";
    excludedClasses?: ClassId[];
    preferredClass?: ClassId;
    memoryHints?: MemoryHints;
    recommendVariantId?: string;
  } & BuildIntentSignals;
};

type RecommendResponse = {
  sessionId: string;
  destinyId: string;
  buildPlanId?: string;
  buildSheetPath?: string;
  viabilityNotes?: string[];
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
  buildPlanId?: string;
  buildSheetPath?: string;
  viabilityNotes?: string[];
  sourceType: "template" | "ai";
  fallbackUsed: boolean;
  output: DestinyFixture;
};

export type BuildPlanResponse = {
  buildPlanId: string;
  destinyId: string;
  sessionId: string;
  status: string;
  publishTier: string;
  plan: unknown;
  error: string | null;
};

export type NameCandidateRow = {
  lane: string;
  genderLean: string | null;
  name: string;
};

export type BuildCommitResponse = {
  commitId: string;
  slug: string;
  path: string;
};

export type BuildCommitRecord = {
  id: string;
  slug: string;
  sessionId: string;
  destinyId: string;
  buildPlanId: string | null;
  commitName: string | null;
  sourceType: string;
  payload: {
    destiny?: DestinyFixture;
    plan?: unknown;
  } | null;
  path: string;
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
  growth: {
    autopilotEnabled: boolean;
    hardStopEnabled: boolean;
    defaultTrafficPercent: number;
    defaultHoldoutPercent: number;
    minSampleSize: number;
  };
};

export type GrowthSurface = "content" | "recommendation" | "ui" | "share" | "onboarding";
export type GrowthAssignmentResponse = {
  assignmentId: string;
  sessionId: string;
  surface: GrowthSurface;
  variantId: string | null;
  experimentId: string | null;
  payload: {
    headline?: string;
    subline?: string;
    ctaPrimary?: string;
    ctaSecondary?: string;
    sharePromptPrefix?: string;
  } | null;
  holdout: boolean;
};

function destinyResultFromJson(data: RecommendResponse): DestinyResult {
  return {
    sessionId: data.sessionId,
    destinyId: data.destinyId,
    buildPlanId: data.buildPlanId,
    buildSheetPath: data.buildSheetPath,
    viabilityNotes: data.viabilityNotes,
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

export async function fetchDestiny(input: RecommendRequest): Promise<DestinyResult> {
  const post = (body: RecommendRequest) =>
    fetch("/api/v1/recommend", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

  let response = await post(input);

  if (!response.ok && response.status === 400) {
    let errBody: { error?: string } = {};
    try {
      errBody = (await response.json()) as { error?: string };
    } catch {
      throw new Error(`recommend_failed:${response.status}`);
    }
    if (errBody.error === "invalid_input") {
      clearMemoryProfile();
      response = await post({
        ...input,
        signals: { ...input.signals, memoryHints: buildMemoryHints() },
      });
    }
  }

  if (!response.ok) {
    throw new Error(`recommend_failed:${response.status}`);
  }

  const data = (await response.json()) as RecommendResponse;
  return destinyResultFromJson(data);
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

export async function fetchGrowthAssignment(input: {
  sessionId: string;
  surface: GrowthSurface;
  entryPath?: "release_spirit" | "draft_a_run" | "lucky_roll";
}): Promise<GrowthAssignmentResponse> {
  const response = await fetch("/api/v1/growth/assign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(`growth_assign_failed:${response.status}`);
  }
  return (await response.json()) as GrowthAssignmentResponse;
}

export async function submitGrowthOutcome(input: {
  assignmentId: string;
  converted?: boolean;
  outcome?: Record<string, unknown>;
}): Promise<void> {
  const response = await fetch("/api/v1/growth/outcome", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(`growth_outcome_failed:${response.status}`);
  }
}

export async function fetchBuildPlan(destinyId: string): Promise<BuildPlanResponse> {
  const response = await fetch(`/api/v1/build/${encodeURIComponent(destinyId)}`);
  if (!response.ok) {
    throw new Error(`build_fetch_failed:${response.status}`);
  }
  return (await response.json()) as BuildPlanResponse;
}

export async function requestBuildPlan(input: {
  destinyId: string;
  sessionId: string;
  recommendInput?: RecommendRequest;
}): Promise<BuildPlanResponse> {
  const response = await fetch("/api/v1/build", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok && response.status !== 201 && response.status !== 202) {
    throw new Error(`build_post_failed:${response.status}`);
  }
  return (await response.json()) as BuildPlanResponse;
}

export async function fetchNameCandidates(params?: {
  lane?: string;
  genderLean?: string;
  limit?: number;
}): Promise<{ names: NameCandidateRow[] }> {
  const q = new URLSearchParams();
  if (params?.lane) q.set("lane", params.lane);
  if (params?.genderLean) q.set("genderLean", params.genderLean);
  if (params?.limit) q.set("limit", String(params.limit));
  const response = await fetch(`/api/v1/build/names?${q.toString()}`);
  if (!response.ok) {
    throw new Error(`names_fetch_failed:${response.status}`);
  }
  return (await response.json()) as { names: NameCandidateRow[] };
}

export async function generateNameCandidates(input: {
  sessionId: string;
  destinyId?: string;
  style?: "lore_world" | "hc_practical" | "light_humor" | "grimdark" | "neutral" | "pop_culture";
  count?: number;
  rerollSeed?: string;
  currentName?: string;
  mode?: "default" | "reflective" | "high_variance" | "humor";
  variance?: number;
  context?: string;
}): Promise<{ names: NameCandidateRow[]; aiUsed: boolean }> {
  const response = await fetch("/api/v1/build/names/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(`names_generate_failed:${response.status}`);
  }
  return (await response.json()) as { names: NameCandidateRow[]; aiUsed: boolean };
}

export async function commitJourneyBuild(input: {
  sessionId: string;
  destinyId: string;
  commitName?: string;
}): Promise<BuildCommitResponse> {
  const response = await fetch("/api/v1/journey/commit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok && response.status !== 201) {
    throw new Error(`journey_commit_failed:${response.status}`);
  }
  return (await response.json()) as BuildCommitResponse;
}

export async function fetchBuildCommit(slug: string): Promise<BuildCommitRecord> {
  const response = await fetch(`/api/v1/journey/commit/${encodeURIComponent(slug)}`);
  if (!response.ok) {
    throw new Error(`build_commit_fetch_failed:${response.status}`);
  }
  return (await response.json()) as BuildCommitRecord;
}

export async function submitBuildCommitMemorial(
  slug: string,
  input: {
    sessionId: string;
    level?: number;
    zone: string;
    cause: string;
    killer?: string;
    note?: string;
    rating?: string;
  },
): Promise<void> {
  const response = await fetch(`/api/v1/journey/commit/${encodeURIComponent(slug)}/memorial`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(`build_commit_memorial_failed:${response.status}`);
  }
}
