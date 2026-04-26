import type { BuildIntentSignals } from "../../lib/buildIntentTypes";
import type { JourneyVectorKey } from "../../content/identityAssets";
import { PROFESSION_INTENT_ANCHOR_TAGS, toggleList } from "./intentOptions";

export type VectorQuestion = {
  id: string;
  prompt: string;
  answers: string[];
  /** Pure: returns the next signals object given the current value + chosen answer. */
  apply: (value: BuildIntentSignals, answer: string) => BuildIntentSignals;
};

/**
 * Question stack per pillar. Balanced uses index 0 only; Dialed-in uses the full list.
 * Each `apply` is pure so it can be tested in isolation.
 */
export const QUESTIONS_BY_VECTOR: Record<JourneyVectorKey, VectorQuestion[]> = {
  profession: [
    {
      id: "prof_priority",
      prompt: "Which primary profession anchor do you want?",
      answers: ["Mining + Engineering", "Herbalism + Alchemy", "Tailoring + Enchanting", "Auction-house focused"],
      apply: (value, a) => ({
        ...value,
        professionIntents: [
          a === "Mining + Engineering"
            ? "mining_engineering_pair"
            : a === "Herbalism + Alchemy"
              ? "herbalism_alchemy_pair"
              : a === "Tailoring + Enchanting"
                ? "tailoring_bags_arcane"
                : "auction_house_play",
          ...((value.professionIntents ?? []).filter((p) => !PROFESSION_INTENT_ANCHOR_TAGS.has(p))),
        ].slice(0, 4) as BuildIntentSignals["professionIntents"],
      }),
    },
    {
      id: "prof_tempo",
      prompt: "Pick one secondary focus",
      answers: ["First Aid mandatory", "Consumable heavy", "Cooking + Fishing", "Gather then pivot"],
      apply: (value, a) => ({
        ...value,
        professionIntents: toggleList(
          value.professionIntents,
          a === "First Aid mandatory"
            ? "first_aid_mandatory_mindset"
            : a === "Consumable heavy"
              ? "alchemy_consumables"
              : a === "Cooking + Fishing"
                ? "fishing_supports_cooking"
                : "early_gathering_then_pivot_engineering",
          4,
        ) as BuildIntentSignals["professionIntents"],
      }),
    },
  ],
  playstyle: [
    {
      id: "style_risk",
      prompt: "How much risk are you comfortable with?",
      answers: ["Very low", "Low", "Balanced", "High"],
      apply: (value, a) => ({
        ...value,
        statPhilosophy: toggleList(
          value.statPhilosophy,
          a === "Very low" ? "stamina_forward" : a === "Low" ? "balanced" : a === "Balanced" ? "balanced" : "meme_glass",
          3,
        ) as BuildIntentSignals["statPhilosophy"],
      }),
    },
    {
      id: "style_pulls",
      prompt: "Preferred pull cadence?",
      answers: ["Singles only", "Controlled chains", "Mixed", "Fast pulls"],
      apply: (value, a) => ({
        ...value,
        buildVectors: toggleList(
          value.buildVectors,
          a === "Singles only" ? "solo" : a === "Controlled chains" ? "tank" : a === "Mixed" ? "hybrid" : "rage",
          6,
        ) as BuildIntentSignals["buildVectors"],
      }),
    },
  ],
  class_fantasy: [
    {
      id: "fantasy_tone",
      prompt: "Which fantasy tone do you want?",
      answers: ["Holy", "Nature", "Arcane", "Shadow"],
      apply: (value, a) => ({
        ...value,
        buildVectors: toggleList(
          value.buildVectors,
          a === "Holy" ? "holy" : a === "Nature" ? "nature" : a === "Arcane" ? "caster" : "demonic",
          6,
        ) as BuildIntentSignals["buildVectors"],
      }),
    },
    {
      id: "fantasy_weapon",
      prompt: "Weapon style preference?",
      answers: ["Two-hander", "Dual wield", "Caster focus", "Flexible"],
      apply: (value, a) => ({
        ...value,
        buildVectors: toggleList(
          value.buildVectors,
          a === "Two-hander" ? "melee" : a === "Dual wield" ? "melee" : a === "Caster focus" ? "caster" : "hybrid",
          6,
        ) as BuildIntentSignals["buildVectors"],
      }),
    },
  ],
  combat_style: [
    {
      id: "combat_distance",
      prompt: "Preferred combat distance?",
      answers: ["Melee", "Ranged", "Hybrid", "No preference"],
      apply: (value, a) => ({
        ...value,
        buildVectors: toggleList(
          value.buildVectors,
          a === "Melee" ? "melee" : a === "Ranged" ? "ranged" : a === "Hybrid" ? "hybrid" : "hybrid",
          6,
        ) as BuildIntentSignals["buildVectors"],
      }),
    },
    {
      id: "combat_ctrl",
      prompt: "More control or more damage pace?",
      answers: ["High control", "Balanced", "Higher damage pace", "Unpredictable is fine"],
      apply: (value, a) => ({
        ...value,
        buildVectors: toggleList(
          value.buildVectors,
          a === "High control" ? "tank" : a === "Balanced" ? "hybrid" : a === "Higher damage pace" ? "rage" : "melee",
          6,
        ) as BuildIntentSignals["buildVectors"],
      }),
    },
  ],
  survivability: [
    {
      id: "survival_core",
      prompt: "What survival profile fits you?",
      answers: ["Never die", "Safe with speed", "Balanced", "High risk/high pace"],
      apply: (value, a) => ({
        ...value,
        statPhilosophy: toggleList(
          value.statPhilosophy,
          a === "Never die" ? "stamina_forward" : a === "Safe with speed" ? "agility_forward" : a === "Balanced" ? "balanced" : "meme_glass",
          3,
        ) as BuildIntentSignals["statPhilosophy"],
      }),
    },
    {
      id: "survival_recovery",
      prompt: "Recovery style?",
      answers: ["Slow and steady", "Burst recovery", "Minimize downtime", "Map aware"],
      apply: (value, a) => ({
        ...value,
        buildVectors: toggleList(
          value.buildVectors,
          a === "Slow and steady" ? "tank" : a === "Burst recovery" ? "hybrid" : a === "Minimize downtime" ? "solo" : "group_ok",
          6,
        ) as BuildIntentSignals["buildVectors"],
      }),
    },
  ],
  surprise: [
    {
      id: "surprise_mode",
      prompt: "How wild should the surprise be?",
      answers: ["Low variance", "Balanced", "High variance", "Full wildcard"],
      apply: (value, a) => ({
        ...value,
        raceMode: a === "Full wildcard" ? "surprise" : "signal_inferred",
      }),
    },
    {
      id: "surprise_class",
      prompt: "Class flexibility for surprise?",
      answers: ["Any spec ok", "Avoid pet classes", "Prefer hybrid classes", "Full wildcard"],
      apply: (value, a) => ({
        ...value,
        buildVectors: toggleList(
          value.buildVectors,
          a === "Avoid pet classes"
            ? "solo"
            : a === "Prefer hybrid classes"
              ? "hybrid"
              : a === "Full wildcard"
                ? "caster"
                : "group_ok",
          6,
        ) as BuildIntentSignals["buildVectors"],
      }),
    },
  ],
};

/** First question of a pillar (used by Balanced mode). */
export function balancedQuestionFor(vector: JourneyVectorKey, opts?: { soloSelfFound?: boolean }): VectorQuestion {
  const raw = QUESTIONS_BY_VECTOR[vector][0]!;
  if (vector === "profession" && opts?.soloSelfFound) {
    return {
      ...raw,
      answers: raw.answers.filter((a) => a !== "Auction-house focused"),
    };
  }
  return raw;
}
