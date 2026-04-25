import type { ClassId, Faction } from "./types";

type RaceToken = "human" | "dwarf" | "night_elf" | "gnome" | "orc" | "undead" | "tauren" | "troll";

const CLASS_RACES: Record<ClassId, RaceToken[]> = {
  warrior: ["human", "dwarf", "night_elf", "gnome", "orc", "undead", "tauren", "troll"],
  mage: ["human", "gnome", "undead", "troll"],
  hunter: ["dwarf", "night_elf", "orc", "tauren", "troll"],
  warlock: ["human", "gnome", "orc", "undead"],
  priest: ["human", "dwarf", "night_elf", "undead", "troll"],
  rogue: ["human", "dwarf", "night_elf", "gnome", "orc", "undead", "troll"],
  druid: ["night_elf", "tauren"],
  paladin: ["human", "dwarf"],
  shaman: ["orc", "tauren", "troll"],
};

const RACE_LABELS: Record<RaceToken, string> = {
  human: "human",
  dwarf: "dwarf",
  night_elf: "night elf",
  gnome: "gnome",
  orc: "orc",
  undead: "undead",
  tauren: "tauren",
  troll: "troll",
};

const RACE_FACTION: Record<RaceToken, Faction> = {
  human: "alliance",
  dwarf: "alliance",
  night_elf: "alliance",
  gnome: "alliance",
  orc: "horde",
  undead: "horde",
  tauren: "horde",
  troll: "horde",
};

function normalizeRaceToken(value: string | undefined): RaceToken | null {
  if (!value) return null;
  const text = value.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (!text) return null;
  if (text.includes("nightelf")) return "night_elf";
  if (text.includes("undead") || text.includes("forsaken")) return "undead";
  if (text.includes("human")) return "human";
  if (text.includes("dwarf")) return "dwarf";
  if (text.includes("gnome")) return "gnome";
  if (text.includes("orc")) return "orc";
  if (text.includes("tauren")) return "tauren";
  if (text.includes("troll")) return "troll";
  return null;
}

/** Ensure race/faction suggestions are valid for class + Era race set. */
export function coerceClassRaceSuggestions(params: {
  classId: ClassId;
  raceSuggestion?: string;
  factionSuggestion?: "horde" | "alliance" | "neutral";
}) {
  const allowed = CLASS_RACES[params.classId];
  const token = normalizeRaceToken(params.raceSuggestion);
  const safeRaceToken = (token && allowed.includes(token) ? token : allowed[0]) ?? "human";
  const safeFaction = RACE_FACTION[safeRaceToken];
  return {
    raceSuggestion: RACE_LABELS[safeRaceToken],
    factionSuggestion: safeFaction,
  };
}

