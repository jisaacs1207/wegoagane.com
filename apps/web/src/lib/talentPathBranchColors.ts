import type { ClassId } from "../icons/types";

export type BranchAccent = { fg: string; border: string; softBg: string };

const FALLBACK = ["#7eb8da", "#d4b15a", "#b894d6", "#7bc99a", "#e09a7a", "#9aa8c4"];

function hashHue(label: string): number {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return h % 360;
}

/** Lowercase tree slug -> readable accent on dark UI. */
const BY_CLASS: Record<ClassId, Record<string, BranchAccent>> = {
  priest: {
    discipline: { fg: "#b8d4f0", border: "#6a9fd4", softBg: "rgba(110, 159, 212, 0.18)" },
    holy: { fg: "#ffe6a8", border: "#d4a84a", softBg: "rgba(212, 168, 74, 0.2)" },
    shadow: { fg: "#d4b8f0", border: "#9b6fd4", softBg: "rgba(155, 111, 212, 0.2)" },
  },
  warrior: {
    arms: { fg: "#f0c8a8", border: "#c97a4a", softBg: "rgba(201, 122, 74, 0.2)" },
    fury: { fg: "#f0a8a8", border: "#d45a5a", softBg: "rgba(212, 90, 90, 0.18)" },
    protection: { fg: "#c8d8f0", border: "#6a8ad4", softBg: "rgba(106, 138, 212, 0.2)" },
  },
  mage: {
    arcane: { fg: "#d4c4ff", border: "#9b7ee6", softBg: "rgba(155, 126, 230, 0.2)" },
    fire: { fg: "#ffb8a0", border: "#e07050", softBg: "rgba(224, 112, 80, 0.18)" },
    frost: { fg: "#b8e8ff", border: "#4a9ed4", softBg: "rgba(74, 158, 212, 0.2)" },
  },
  rogue: {
    assassination: { fg: "#c8f0c8", border: "#5ab86a", softBg: "rgba(90, 184, 106, 0.18)" },
    combat: { fg: "#f0e0b8", border: "#d4b060", softBg: "rgba(212, 176, 96, 0.2)" },
    subtlety: { fg: "#d0d8e8", border: "#8898b8", softBg: "rgba(136, 152, 184, 0.2)" },
  },
  hunter: {
    "beast mastery": { fg: "#c8f0b0", border: "#7ab84a", softBg: "rgba(122, 184, 74, 0.2)" },
    marksmanship: { fg: "#f0d8b8", border: "#d4984a", softBg: "rgba(212, 152, 74, 0.18)" },
    survival: { fg: "#e8c8a8", border: "#b88850", softBg: "rgba(184, 136, 80, 0.18)" },
  },
  warlock: {
    affliction: { fg: "#e8b8f8", border: "#a46ad4", softBg: "rgba(164, 106, 212, 0.2)" },
    demonology: { fg: "#d8c8f8", border: "#8a6ad4", softBg: "rgba(138, 106, 212, 0.18)" },
    destruction: { fg: "#ffb8a0", border: "#d46040", softBg: "rgba(212, 96, 64, 0.18)" },
  },
  druid: {
    balance: { fg: "#e8e0ff", border: "#9b8ad4", softBg: "rgba(155, 138, 212, 0.2)" },
    feral: { fg: "#f0d8b8", border: "#c9984a", softBg: "rgba(201, 152, 74, 0.18)" },
    restoration: { fg: "#c8f0e0", border: "#5ab898", softBg: "rgba(90, 184, 152, 0.18)" },
  },
  paladin: {
    holy: { fg: "#fff0c8", border: "#e6c060", softBg: "rgba(230, 192, 96, 0.22)" },
    protection: { fg: "#d8e8ff", border: "#6a8ad4", softBg: "rgba(106, 138, 212, 0.2)" },
    retribution: { fg: "#ffe8c8", border: "#d49840", softBg: "rgba(212, 152, 64, 0.18)" },
  },
  shaman: {
    elemental: { fg: "#c8e8ff", border: "#4a9ee6", softBg: "rgba(74, 158, 230, 0.2)" },
    enhancement: { fg: "#e8d8ff", border: "#8a6ad4", softBg: "rgba(138, 106, 212, 0.18)" },
    restoration: { fg: "#c8f0e8", border: "#4ab898", softBg: "rgba(74, 184, 152, 0.18)" },
  },
};

export function accentForTalentBranch(classId: ClassId, branchName: string): BranchAccent {
  const key = branchName.trim().toLowerCase();
  const table = BY_CLASS[classId];
  if (table?.[key]) return table[key]!;
  const h = hashHue(branchName);
  const fg = `hsl(${h} 72% 78%)`;
  const border = `hsl(${h} 55% 52%)`;
  const i = Math.abs(hashHue(branchName + classId)) % FALLBACK.length;
  return { fg, border, softBg: `color-mix(in srgb, ${FALLBACK[i]} 35%, transparent)` };
}
