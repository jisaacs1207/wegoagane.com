import type { ClassTalents } from "./types";

/**
 * Classic Era (1.12) Druid talent grid. Coverage prioritises Feral cat/bear, Restoration HoT
 * staples, and Balance Moonkin core. Aliases catch common AI phrasings (e.g. "OoC" for Omen of
 * Clarity).
 */
export const druidTalents: ClassTalents = {
  classId: "druid",
  trees: [
    {
      branch: "Balance",
      slug: "balance",
      talents: [
        { id: "balance.starlight_wrath", name: "Starlight Wrath", iconKey: "wrath", tier: 1, column: 2, maxRank: 5 },
        { id: "balance.improved_moonfire", name: "Improved Moonfire", aliases: ["imp moonfire"], iconKey: "moonfire", tier: 1, column: 3, maxRank: 5 },
        { id: "balance.natures_grasp", name: "Nature's Grasp", aliases: ["natures grasp"], iconKey: "natures_grasp", tier: 2, column: 1, maxRank: 1 },
        { id: "balance.improved_natures_grasp", name: "Improved Nature's Grasp", iconKey: "natures_grasp", tier: 2, column: 2, maxRank: 4, prereqId: "balance.natures_grasp" },
        { id: "balance.improved_entangling_roots", name: "Improved Entangling Roots", iconKey: "entangling_roots", tier: 2, column: 3, maxRank: 3 },
        { id: "balance.improved_thorns", name: "Improved Thorns", iconKey: "thorns", tier: 3, column: 1, maxRank: 3 },
        { id: "balance.omen_of_clarity", name: "Omen of Clarity", aliases: ["ooc", "clarity"], iconKey: "clarity", tier: 3, column: 3, maxRank: 1 },
        { id: "balance.natures_reach", name: "Nature's Reach", iconKey: "natures_reach", tier: 4, column: 2, maxRank: 2 },
        { id: "balance.vengeance", name: "Vengeance", iconKey: "vengeance", tier: 4, column: 3, maxRank: 5 },
        { id: "balance.improved_starfire", name: "Improved Starfire", iconKey: "starfire", tier: 5, column: 2, maxRank: 5 },
        { id: "balance.natures_grace", name: "Nature's Grace", iconKey: "natures_grace", tier: 6, column: 2, maxRank: 1 },
        { id: "balance.moonglow", name: "Moonglow", iconKey: "moonglow", tier: 6, column: 3, maxRank: 3 },
        { id: "balance.moonfury", name: "Moonfury", iconKey: "moonfire", tier: 6, column: 4, maxRank: 5 },
        { id: "balance.moonkin_form", name: "Moonkin Form", aliases: ["moonkin"], iconKey: "moonkin", tier: 7, column: 2, maxRank: 1 },
      ],
    },
    {
      branch: "Feral Combat",
      slug: "feral",
      talents: [
        { id: "feral.ferocity", name: "Ferocity", iconKey: "ferocity", tier: 1, column: 2, maxRank: 5 },
        { id: "feral.feral_aggression", name: "Feral Aggression", iconKey: "demoralizing_roar", tier: 1, column: 3, maxRank: 5 },
        { id: "feral.feral_instinct", name: "Feral Instinct", iconKey: "feral_instinct", tier: 2, column: 1, maxRank: 5 },
        { id: "feral.brutal_impact", name: "Brutal Impact", iconKey: "bash", tier: 2, column: 2, maxRank: 2 },
        { id: "feral.thick_hide", name: "Thick Hide", iconKey: "thick_hide", tier: 2, column: 3, maxRank: 5 },
        { id: "feral.feline_swiftness", name: "Feline Swiftness", iconKey: "feline_swiftness", tier: 3, column: 1, maxRank: 2 },
        { id: "feral.feral_charge", name: "Feral Charge", iconKey: "feral_charge", tier: 3, column: 2, maxRank: 1 },
        { id: "feral.sharpened_claws", name: "Sharpened Claws", iconKey: "sharpened_claws", tier: 3, column: 3, maxRank: 3 },
        { id: "feral.improved_shred", name: "Improved Shred", iconKey: "shred", tier: 4, column: 1, maxRank: 2 },
        { id: "feral.predatory_strikes", name: "Predatory Strikes", iconKey: "predatory_strikes", tier: 4, column: 2, maxRank: 3 },
        { id: "feral.blood_frenzy", name: "Blood Frenzy", iconKey: "blood_frenzy", tier: 4, column: 3, maxRank: 2 },
        { id: "feral.primal_fury", name: "Primal Fury", iconKey: "primal_fury", tier: 5, column: 1, maxRank: 2 },
        { id: "feral.savage_fury", name: "Savage Fury", iconKey: "claw", tier: 5, column: 2, maxRank: 2 },
        { id: "feral.faerie_fire_feral", name: "Faerie Fire (Feral)", aliases: ["feral faerie fire", "ffaf"], iconKey: "faerie_fire", tier: 5, column: 3, maxRank: 1 },
        { id: "feral.heart_of_the_wild", name: "Heart of the Wild", aliases: ["hotw"], iconKey: "heart_of_the_wild", tier: 6, column: 2, maxRank: 5 },
        { id: "feral.leader_of_the_pack", name: "Leader of the Pack", aliases: ["lotp"], iconKey: "leader_of_the_pack", tier: 7, column: 2, maxRank: 1, prereqId: "feral.heart_of_the_wild" },
      ],
    },
    {
      branch: "Restoration",
      slug: "restoration",
      talents: [
        { id: "restoration.improved_mark_of_the_wild", name: "Improved Mark of the Wild", aliases: ["imp motw"], iconKey: "mark_of_the_wild", tier: 1, column: 2, maxRank: 5 },
        { id: "restoration.furor", name: "Furor", iconKey: "furor", tier: 1, column: 3, maxRank: 5 },
        { id: "restoration.improved_healing_touch", name: "Improved Healing Touch", iconKey: "healing_touch", tier: 2, column: 1, maxRank: 5 },
        { id: "restoration.natures_focus", name: "Nature's Focus", iconKey: "natures_focus", tier: 2, column: 2, maxRank: 5 },
        { id: "restoration.improved_enrage", name: "Improved Enrage", iconKey: "enrage", tier: 2, column: 3, maxRank: 2 },
        { id: "restoration.reflection", name: "Reflection", iconKey: "reflection", tier: 3, column: 1, maxRank: 3 },
        { id: "restoration.insect_swarm", name: "Insect Swarm", iconKey: "insect_swarm", tier: 3, column: 2, maxRank: 1 },
        { id: "restoration.subtlety", name: "Subtlety", iconKey: "subtlety_druid", tier: 3, column: 3, maxRank: 5 },
        { id: "restoration.tranquil_spirit", name: "Tranquil Spirit", iconKey: "tranquility", tier: 4, column: 1, maxRank: 5 },
        { id: "restoration.improved_rejuvenation", name: "Improved Rejuvenation", iconKey: "rejuvenation", tier: 4, column: 3, maxRank: 3 },
        { id: "restoration.natures_swiftness", name: "Nature's Swiftness", aliases: ["nature swiftness", "ns"], iconKey: "natures_swiftness", tier: 5, column: 1, maxRank: 1 },
        { id: "restoration.gift_of_nature", name: "Gift of Nature", iconKey: "gift_of_nature", tier: 5, column: 2, maxRank: 5 },
        { id: "restoration.improved_tranquility", name: "Improved Tranquility", iconKey: "tranquility", tier: 5, column: 3, maxRank: 2 },
        { id: "restoration.improved_regrowth", name: "Improved Regrowth", iconKey: "regrowth", tier: 6, column: 2, maxRank: 5 },
        { id: "restoration.swiftmend", name: "Swiftmend", iconKey: "swiftmend", tier: 7, column: 2, maxRank: 1 },
      ],
    },
  ],
};
