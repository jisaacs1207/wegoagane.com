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
};

export type RecommendInput = {
  sessionId?: string;
  entryPath: EntryPath;
  signals: RecommendSignals;
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

export type DestinyFeedbackInput = {
  sessionId: string;
  destinyId: string;
  choice: FeedbackChoice;
  note?: string;
  rerollFromClassId?: ClassId;
  rerollToClassId?: ClassId;
};
