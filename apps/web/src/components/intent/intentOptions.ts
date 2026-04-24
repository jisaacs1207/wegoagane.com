import type { BuildIntentSignals } from "../../lib/buildIntentTypes";

export type IntentDepth = "quick" | "balanced" | "dialed_in";
export type CorePreset = "safe" | "balanced" | "bold";

export const STAT_OPTIONS = [
  { id: "stamina_forward", label: "Stam first" },
  { id: "intellect_forward", label: "Int" },
  { id: "agility_forward", label: "Agi" },
  { id: "strength_forward", label: "Str" },
  { id: "spirit_forward", label: "Spirit" },
  { id: "balanced", label: "Balanced" },
  { id: "meme_glass", label: "Spicy / glass" },
] as const;

export const PROF_OPTIONS = [
  { id: "engineering_outs", label: "Engineering" },
  { id: "first_aid_mandatory_mindset", label: "First Aid heavy" },
  { id: "herbalism_alchemy_pair", label: "Herb + Alch" },
  { id: "alchemy_consumables", label: "Potion economy" },
  { id: "mining_engineering_pair", label: "Mine + Eng" },
  { id: "dual_gathering_bootstrap", label: "Dual gather" },
  { id: "skinning_mining_early", label: "Skin + mine early" },
  { id: "leatherworker_hunter_synergy", label: "LW + leather" },
  { id: "tailoring_bags_arcane", label: "Tailor + bags" },
  { id: "enchanter_disenchant_route", label: "Enchant + DE" },
  { id: "blacksmith_weaponsmith_fantasy", label: "Smith fantasy" },
  { id: "cooking_high_value", label: "Cooking focus" },
  { id: "fishing_supports_cooking", label: "Fish + cook" },
  { id: "fishing_optional", label: "Fishing optional" },
  { id: "early_gathering_then_pivot_engineering", label: "Gather then Eng pivot" },
  { id: "auction_house_play", label: "Auction house play" },
] as const;

export const VECTOR_OPTIONS = [
  { id: "solo", label: "Solo" },
  { id: "group_ok", label: "Group okay" },
  { id: "hybrid", label: "Hybrid toolkit" },
  { id: "pet", label: "Pet class" },
  { id: "melee", label: "Melee" },
  { id: "ranged", label: "Ranged" },
  { id: "caster", label: "Caster" },
  { id: "heal", label: "Healing" },
  { id: "tank", label: "Tanky" },
  { id: "mana", label: "Mana" },
  { id: "rage", label: "Rage" },
  { id: "energy", label: "Energy" },
  { id: "demonic", label: "Dark fantasy" },
  { id: "holy", label: "Holy fantasy" },
  { id: "nature", label: "Nature fantasy" },
] as const;

export const RACE_MODES = [
  { id: "signal_inferred", label: "From answers" },
  { id: "optimize_theme", label: "Optimize" },
  { id: "surprise", label: "Surprise me" },
  { id: "user_pick", label: "I pick race" },
] as const;

export const DEPTH_OPTIONS: Array<{ id: IntentDepth; label: string; helper: string }> = [
  { id: "quick", label: "Quick pick", helper: "Fast start, fewer knobs, still HC-aware." },
  { id: "balanced", label: "Balanced", helper: "Best first-pass fit for most players." },
  { id: "dialed_in", label: "Dialed-in", helper: "More inputs, tighter fit, slightly slower." },
];

export function toggleList(list: string[] | undefined, id: string, max: number): string[] {
  const cur = list ?? [];
  if (cur.includes(id)) return cur.filter((x) => x !== id);
  if (cur.length >= max) return [...cur.slice(1), id];
  return [...cur, id];
}

export function applyCorePreset(value: BuildIntentSignals, preset: CorePreset): BuildIntentSignals {
  if (preset === "safe") {
    return {
      ...value,
      statPhilosophy: ["stamina_forward", "balanced"],
      professionIntents: ["engineering_outs", "first_aid_mandatory_mindset"],
      buildVectors: ["solo", "tank", "mana"],
    };
  }
  if (preset === "bold") {
    return {
      ...value,
      statPhilosophy: ["meme_glass", "agility_forward"],
      professionIntents: ["dual_gathering_bootstrap", "auction_house_play"],
      buildVectors: ["melee", "ranged", "solo"],
    };
  }
  return {
    ...value,
    statPhilosophy: ["balanced"],
    professionIntents: ["engineering_outs", "cooking_high_value"],
    buildVectors: ["solo", "group_ok"],
  };
}

export function optionLabel(id: string): string {
  const all = [...STAT_OPTIONS, ...PROF_OPTIONS, ...VECTOR_OPTIONS, ...RACE_MODES];
  return all.find((x) => x.id === id)?.label ?? id;
}

/** Human labels for chips the player picked in the build journey. */
export function signalSummaryLabels(s: BuildIntentSignals): string[] {
  const ids: string[] = [];
  ids.push(...(s.statPhilosophy ?? []));
  ids.push(...(s.professionIntents ?? []));
  ids.push(...(s.buildVectors ?? []));
  if (s.raceMode) ids.push(s.raceMode);
  return ids.map((id) => optionLabel(id));
}
