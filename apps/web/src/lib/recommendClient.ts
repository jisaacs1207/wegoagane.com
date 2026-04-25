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
  /** API widened class eligibility so template+AI could run (strict filters had zero matches). */
  filterRelaxedForAi?: boolean;
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
  filterRelaxedForAi?: boolean;
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
    filterRelaxedForAi: data.filterRelaxedForAi,
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

async function readApiJsonError(response: Response): Promise<{ error?: string }> {
  try {
    return (await response.json()) as { error?: string };
  } catch {
    return {};
  }
}

async function throwApiFailure(response: Response, label: string): Promise<never> {
  const e = await readApiJsonError(response);
  throw new Error(`${label}:${response.status}:${e.error ?? "unknown"}`);
}

async function parseJsonOk<T>(response: Response, label: string): Promise<T> {
  if (!response.ok) await throwApiFailure(response, label);
  return (await response.json()) as T;
}

/** Maps `fetchDestiny` errors (e.g. `recommend_failed:400:no_viable_build`) to UI copy. */
export function destinyRecommendErrorHint(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (message.includes("recommend_failed:400:invalid_input")) {
    return "Generation failed due to invalid input. Adjust filters or optional notes and try again.";
  }
  if (message.includes("recommend_failed:422:validation_failed")) {
    return "Generation failed an output safety check. Try again with slightly different filters.";
  }
  if (message.includes("recommend_failed:400:no_viable_build")) {
    return "No build matched all of those filters together. Remove a chip or loosen one constraint, then try again.";
  }
  if (message.includes("recommend_failed:400:no_eligible_archetypes")) {
    return "Those filters removed every eligible archetype. Relax a constraint and try again.";
  }
  if (message.includes("recommend_failed:400:no_ranked_candidate")) {
    return "Could not pick a winner from the filtered set. Broaden filters and try again.";
  }
  if (message.includes("recommend_failed:503")) {
    return "The recommender is briefly unavailable. Try again in a moment.";
  }
  if (message.startsWith("recommend_failed:")) {
    return "Generation failed. Adjust your path or try again.";
  }
  return "Generation failed. Adjust your path or try again.";
}

/** True when the API error suggests loosening stored build-intent filters (chip prune UX). */
export function recommendErrorSuggestsSoftenFilters(err: unknown): boolean {
  const message = err instanceof Error ? err.message : "";
  return (
    message.includes("recommend_failed:400:no_viable_build") ||
    message.includes("recommend_failed:400:no_eligible_archetypes") ||
    message.includes("recommend_failed:400:no_ranked_candidate")
  );
}

/** Maps non-recommend client errors (`journey_commit:404:destiny_not_found`, etc.) to UI copy. */
export function flowApiErrorHint(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (message.startsWith("recommend_failed")) return destinyRecommendErrorHint(err);
  if (message.includes("journey_commit:404:destiny_not_found")) {
    return "We could not find that destiny for this session. Start the flow again from intent, then regenerate.";
  }
  if (message.includes("journey_commit:400:invalid_input") || message.includes("journey_commit:400:invalid_json")) {
    return "Commit request was invalid. Refresh the page and try commit again.";
  }
  if (message.includes("journey_commit:500:invalid_destiny_payload")) {
    return "Stored destiny data looks corrupted. Generate a new card, then commit.";
  }
  if (message.includes("journey_memorial:404:build_commit_not_found")) {
    return "This commit page is no longer available. Check the URL or return home.";
  }
  if (message.includes("journey_memorial:400:invalid_input") || message.includes("journey_memorial:400:invalid_json")) {
    return "Memorial fields failed validation. Shorten notes and check required fields.";
  }
  if (message.includes("build_commit_fetch:404:build_commit_not_found")) {
    return "Committed build not found. The link may be wrong or the row was removed.";
  }
  if (message.includes("feedback:")) {
    return "Could not save feedback. Check your connection and try again.";
  }
  if (message.includes("share_create:") || message.includes("share_fetch:")) {
    return "Could not start share preview. Try again in a moment.";
  }
  if (message.includes("memorial:422:validation_failed")) {
    return "Memorial output failed a safety check. Adjust wording and try again.";
  }
  if (message.includes("memorial:")) {
    return "Could not create memorial right now. Try again shortly.";
  }
  if (message.includes("names_generate:") || message.includes("names_fetch:")) {
    return "Name service is unavailable. Retry or pick a manual name.";
  }
  if (message.includes("growth_assign:") || message.includes("growth_outcome:")) {
    return "Experiment assignment failed silently; your card still works.";
  }
  if (message.includes("feedback_summary:") || message.includes("analytics_config:")) {
    return "Could not load ops or settings data. Refresh the page.";
  }
  if (message.includes("build_fetch:") || message.includes("build_post:")) {
    return "Build plan service failed. Return to your result and try again.";
  }
  if (message.includes("journey_commit:") || message.includes("journey_memorial:") || message.includes("build_commit_fetch:")) {
    return "That action could not complete. Check your connection and try again.";
  }
  return "Something went wrong. Try again.";
}

export async function fetchDestiny(input: RecommendRequest): Promise<DestinyResult> {
  const post = (body: RecommendRequest) =>
    fetch("/api/v1/recommend", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response = await post(input);

    if (!response.ok && response.status === 400) {
      const errFirst = await readApiJsonError(response);
      if (errFirst.error === "invalid_input") {
        clearMemoryProfile();
        response = await post({
          ...input,
          signals: { ...input.signals, memoryHints: buildMemoryHints() },
        });
      } else {
        throw new Error(`recommend_failed:400:${errFirst.error ?? "unknown"}`);
      }
    }

    if (response.ok) {
      const data = (await response.json()) as RecommendResponse;
      return destinyResultFromJson(data);
    }

    const err = await readApiJsonError(response);
    if (response.status === 503 && err.error === "recommend_internal_error" && attempt < 2) {
      await new Promise((r) => setTimeout(r, 350 + attempt * 200));
      continue;
    }
    if (err.error) throw new Error(`recommend_failed:${response.status}:${err.error}`);
    throw new Error(`recommend_failed:${response.status}`);
  }

  throw new Error("recommend_failed:unknown");
}

export async function fetchMemorial(input: MemorialRequest): Promise<MemorialFixture> {
  const response = await fetch("/api/v1/memorial", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) await throwApiFailure(response, "memorial");

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
  if (!response.ok) await throwApiFailure(response, "feedback");
}

export async function fetchFeedbackSummary(): Promise<FeedbackSummary> {
  const response = await fetch("/api/v1/feedback/summary");
  return parseJsonOk<FeedbackSummary>(response, "feedback_summary");
}

export async function createShareRun(input: CreateShareRequest): Promise<ShareRunResponse> {
  const response = await fetch("/api/v1/share", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJsonOk<ShareRunResponse>(response, "share_create");
}

export async function fetchShareRun(runId: string): Promise<ShareRunResponse> {
  const response = await fetch(`/api/v1/share/${runId}`);
  return parseJsonOk<ShareRunResponse>(response, "share_fetch");
}

export async function fetchAnalyticsConfig(): Promise<AnalyticsConfigResponse> {
  const response = await fetch("/api/v1/analytics/config");
  return parseJsonOk<AnalyticsConfigResponse>(response, "analytics_config");
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
  return parseJsonOk<GrowthAssignmentResponse>(response, "growth_assign");
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
  if (!response.ok) await throwApiFailure(response, "growth_outcome");
}

export async function fetchBuildPlan(destinyId: string): Promise<BuildPlanResponse> {
  const response = await fetch(`/api/v1/build/${encodeURIComponent(destinyId)}`);
  return parseJsonOk<BuildPlanResponse>(response, "build_fetch");
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
    await throwApiFailure(response, "build_post");
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
  return parseJsonOk<{ names: NameCandidateRow[] }>(response, "names_fetch");
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
  return parseJsonOk<{ names: NameCandidateRow[]; aiUsed: boolean }>(response, "names_generate");
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
  return parseJsonOk<BuildCommitResponse>(response, "journey_commit");
}

export async function fetchBuildCommit(slug: string): Promise<BuildCommitRecord> {
  const response = await fetch(`/api/v1/journey/commit/${encodeURIComponent(slug)}`);
  return parseJsonOk<BuildCommitRecord>(response, "build_commit_fetch");
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
  if (!response.ok) await throwApiFailure(response, "journey_memorial");
}
