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

/** Stat / gearing philosophy tags for viability + ranker hints */
export type StatPhilosophyTag =
  | "stamina_forward"
  | "strength_forward"
  | "agility_forward"
  | "intellect_forward"
  | "spirit_forward"
  | "balanced"
  | "meme_glass";

/** Profession / economy intent (Classic HC–aware) */
export type ProfessionIntentTag =
  | "engineering_outs"
  | "alchemy_consumables"
  | "herbalism_alchemy_pair"
  | "mining_engineering_pair"
  | "dual_gathering_bootstrap"
  | "skinning_mining_early"
  | "leatherworker_hunter_synergy"
  | "tailoring_bags_arcane"
  | "enchanter_disenchant_route"
  | "blacksmith_weaponsmith_fantasy"
  | "first_aid_mandatory_mindset"
  | "cooking_high_value"
  | "fishing_supports_cooking"
  | "fishing_optional"
  | "early_gathering_then_pivot_engineering"
  | "auction_house_play";

/** Combat, resource, role, tone vectors */
export type BuildVectorTag =
  | "tank"
  | "heal"
  | "hybrid"
  | "pet"
  | "melee"
  | "ranged"
  | "caster"
  | "mana"
  | "rage"
  | "energy"
  | "holy"
  | "demonic"
  | "nature"
  | "solo"
  | "group_ok";

export type RaceMode = "user_pick" | "signal_inferred" | "optimize_theme" | "surprise";

export type RecommendSignals = {
  mood?: string;
  nextSignal?: string;
  intent?: string;
  freeform?: string;
  factionPreference?: Faction;
  excludedClasses?: ClassId[];
  preferredClass?: ClassId;
  preferredClasses?: ClassId[];
  memoryHints?: MemoryHints;
  recommendVariantId?: string;
  /** Structured build intent (merged with inferred tags from free text) */
  statPhilosophy?: StatPhilosophyTag[];
  professionIntents?: ProfessionIntentTag[];
  buildVectors?: BuildVectorTag[];
  raceMode?: RaceMode;
  /** When raceMode is user_pick: race id string e.g. orc, human */
  pickedRace?: string;
  preferredRaces?: string[];
  excludedRaces?: string[];
  genderLean?: "masculine" | "feminine" | "neutral";
  /** Curated fixture ranker vs AI-prototyped archetype row (requires AI gateway). */
  recommendLane?: "curated" | "experimental";
  /** Client journey: quick random roll vs partial guided vs full question stack. */
  intentDepth?: "quick" | "balanced" | "dialed_in";
  /** Player declared a Solo Self Found run: no AH, no trade buying, gather/craft only. */
  soloSelfFound?: boolean;
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
  /** Most recent archetype keys seen in this session, newest first. */
  recentArchetypeKeys?: string[];
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
  raceSuggestion?: string;
  genderLean?: "masculine" | "feminine" | "neutral";
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
  raceSuggestion?: string;
  factionSuggestion?: Faction | "neutral";
  genderLean?: "masculine" | "feminine" | "neutral";
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
export type RerollVerdict = "totally_off" | "close_but_off" | "resolved";
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
  rerollVerdict?: RerollVerdict;
  parsedSignalJson?: Record<string, unknown>;
  rerollFromClassId?: ClassId;
  rerollToClassId?: ClassId;
};
