import type { ClassId } from "../icons/types";

/** Static copy for M2 card shells — replace with pipeline output later. */
export type MemorialFixture = {
  epitaph: string;
  characterName: string;
  level: number;
  location: string;
  cause: string;
  faction: "horde" | "alliance" | "neutral";
};

export type DestinyFixture = {
  headline: string;
  subline: string;
  classId: ClassId;
  /** Prose tier line — §29.7 may later swap for badges */
  tierProse: string;
  bullets: string[];
};

export const memorialFixture: MemorialFixture = {
  epitaph: "They pulled once too often.",
  characterName: "Stonkee",
  level: 47,
  location: "Stranglethorn Vale",
  cause: "Patrol pack",
  faction: "horde",
};

export const destinyFixture: DestinyFixture = {
  headline: "Orc Frost Mage",
  subline: "Safe path · First 10 Levels",
  classId: "mage",
  tierProse: "Suggested path · template copy only",
  bullets: ["Cold snap opener", "Kite discipline", "No dungeon shortcuts until 60"],
};

export const planningDestinyFixture: DestinyFixture = {
  headline: "Tauren Enhancement Shaman",
  subline: "Planning mode · next run only",
  classId: "shaman",
  tierProse: "Planning preview · template copy only",
  bullets: ["Windfury timing", "Totem cadence", "Melee risk budget"],
};
