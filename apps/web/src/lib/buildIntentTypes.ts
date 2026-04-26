/** How the player scoped the lucky-roll setup (client + API telemetry). */
export type IntentDepth = "quick" | "balanced" | "dialed_in";

/** Mirrors API `RecommendSignals` subset used for build intent chips. */
export type BuildIntentSignals = {
  /** Sent to `/v1/recommend` with the request. */
  intentDepth?: IntentDepth;
  /** Solo Self Found mode: drop AH/trade reliance, bias gather-and-craft. */
  soloSelfFound?: boolean;
  statPhilosophy?: Array<
    | "stamina_forward"
    | "strength_forward"
    | "agility_forward"
    | "intellect_forward"
    | "spirit_forward"
    | "balanced"
    | "meme_glass"
  >;
  professionIntents?: Array<
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
    | "auction_house_play"
  >;
  buildVectors?: Array<
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
    | "group_ok"
  >;
  raceMode?: "user_pick" | "signal_inferred" | "optimize_theme" | "surprise";
  pickedRace?: string;
  factionPreference?: "horde" | "alliance";
  genderLean?: "masculine" | "feminine" | "neutral";
};
