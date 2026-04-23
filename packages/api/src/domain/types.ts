export type EntryPath = "release_spirit" | "draft_a_run" | "lucky_roll";
export type ClassId =
  | "mage"
  | "hunter"
  | "warrior"
  | "warlock"
  | "priest"
  | "rogue"
  | "druid"
  | "paladin"
  | "shaman";
export type Faction = "horde" | "alliance";
export type Tier = "safe" | "off_beaten" | "high_risk" | "just_fun";

export type RecommendSignals = {
  mood?: string;
  nextSignal?: string;
  intent?: string;
  freeform?: string;
  factionPreference?: Faction;
  excludedClasses?: ClassId[];
  preferredClass?: ClassId;
  memoryHints?: MemoryHints;
  recommendVariantId?: string;
};

export type RecommendInput = {
  sessionId?: string;
  entryPath: EntryPath;
  signals: RecommendSignals;
};

export type GrowthSurface = "content" | "recommendation" | "ui" | "share" | "onboarding";
export type GrowthVariantType = "persona_combo" | "copy" | "ui_micro" | "share_prompt" | "ranker_policy";
export type GrowthVariantStatus = "draft" | "validated" | "active" | "promoted" | "retired";
export type GrowthGuardrailStatus = "pending" | "pass" | "fail";
export type GrowthExperimentStatus = "running" | "paused" | "completed";
export type GrowthDecisionAction = "promote" | "hold" | "retire";

export type GrowthVariantPayload = {
  headline?: string;
  subline?: string;
  ctaPrimary?: string;
  ctaSecondary?: string;
  sharePromptPrefix?: string;
  provenance?: {
    assetSource?: "official" | "community_licensed" | "user_generated" | "unknown";
    scrapedFrom?: string;
    licenseTag?: string;
  };
  rankerTweaks?: {
    preferredClassBoost?: number;
    memoryWeightScale?: number;
  };
  personaCombo?: {
    classId?: ClassId;
    professionFocus?: string;
    playstyle?: string;
  };
};

export type GrowthVariant = {
  id: string;
  surface: GrowthSurface;
  variantType: GrowthVariantType;
  status: GrowthVariantStatus;
  promptVersion?: string;
  promptText?: string;
  payload: GrowthVariantPayload;
  payloadHash: string;
  noveltyScore: number;
  guardrailStatus: GrowthGuardrailStatus;
  guardrailNotes?: string;
  sampleSize: number;
  acceptRate: number;
  rerollsPerSession: number;
  postAcceptRatingAvg: number;
  shareCompletionRate: number;
  validationFailureRate: number;
  createdAt: number;
  updatedAt: number;
};

export type GrowthAssignment = {
  assignmentId: string;
  sessionId: string;
  surface: GrowthSurface;
  variantId: string | null;
  experimentId: string | null;
  payload: GrowthVariantPayload | null;
  holdout: boolean;
};

export type MemoryRerollReason =
  | "wrong_class"
  | "wrong_energy"
  | "wrong_goals"
  | "almost_right"
  | "just_curious";

export type MemoryHints = {
  version: number;
  classAffinity?: Partial<Record<ClassId, number>>;
  rerollReasonCounts?: Partial<Record<MemoryRerollReason, number>>;
  confidence?: number;
  updatedAt?: number;
};

export type MemoryFeatures = {
  classAffinity: Partial<Record<ClassId, number>>;
  rerollReasonCounts: Partial<Record<MemoryRerollReason, number>>;
  confidence: number;
  sampleSize: number;
};

export type MemoryRankingConfig = {
  enabled: boolean;
  browserWeight: number;
  serverWeight: number;
  maxBias: number;
  degradeMode: boolean;
  degradeScale: number;
};

export type MemorialInput = {
  sessionId?: string;
  zone: string;
  cause: string;
  mood?: string;
  nextSignal?: string;
  faction?: Faction;
  characterName?: string;
  level?: number;
};

export type Archetype = {
  key: string;
  classId: ClassId;
  faction: Faction | "either";
  title: string;
  subline: string;
  tier: Tier;
  tags: string[];
  safetyMechanism: string;
  first10: string[];
};

export type RankedArchetype = {
  archetype: Archetype;
  score: number;
  reasons: string[];
  memoryBiasApplied?: number;
};

export type DestinyOutput = {
  headline: string;
  subline: string;
  classId: ClassId;
  tierProse: string;
  bullets: string[];
  rationale: string;
  sourceType: "template" | "ai";
};

export type MemorialOutput = {
  epitaph: string;
  characterName: string;
  level: number | null;
  location: string;
  cause: string;
  faction: Faction | "neutral";
  sourceType: "template" | "ai";
};

export type AiErrorType = "ai_timeout" | "ai_invalid_json" | "ai_provider_error";

export type FeedbackChoice = "accept" | "almost_right" | "miss";

export type FeedbackStage = "reroll_gate" | "post_accept";
export type RerollReason =
  | "wrong_class"
  | "wrong_energy"
  | "wrong_goals"
  | "almost_right"
  | "just_curious";
export type PostAcceptRating = "not_this" | "itll_do" | "good_pick" | "this_is_it" | "perfect";

export type DestinyFeedbackInput = {
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
