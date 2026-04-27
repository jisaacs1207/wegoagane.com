import type { ClassId } from "../icons/types";

/**
 * Shape we accept from the API build plan payload. We deliberately match a
 * loose subset (everything optional) so this helper works even before AI
 * fills in the new `signature` block.
 */
export type SpecSummaryInput = {
  classId: ClassId;
  archetypeKey?: string;
  destinyHeadline?: string;
  /** Subline and tier from the destiny card: used first to detect primary tree (e.g. "Arms" in title). */
  destinySubline?: string;
  destinyTierProse?: string;
  talents?: {
    keyPicks?: Array<{ tier?: string; name?: string; rationale?: string }>;
    summary?: string;
    treeAllocations?: Array<{ branch?: string; points?: number }>;
  };
  signature?: {
    tree?: { branch?: string; weight?: number };
    strengths?: string[];
    weaknesses?: string[];
    whyDistinct?: string;
  };
};

export type SpecSummary = {
  /** Branch / talent tree the build leans into (e.g. "Holy", "Protection"). */
  treeBranch: string;
  /** 0..1 share of points in `treeBranch` relative to detected total. */
  treeWeight: number;
  /** Per-branch counts so the UI can render a small distribution bar. */
  treeCounts: { branch: string; count: number }[];
  strengths: string[];
  weaknesses: string[];
  whyDistinct: string;
};

const CLASS_BRANCHES: Record<ClassId, [string, string, string]> = {
  warrior: ["Arms", "Fury", "Protection"],
  mage: ["Arcane", "Fire", "Frost"],
  rogue: ["Assassination", "Combat", "Subtlety"],
  priest: ["Discipline", "Holy", "Shadow"],
  hunter: ["Beast Mastery", "Marksmanship", "Survival"],
  warlock: ["Affliction", "Demonology", "Destruction"],
  druid: ["Balance", "Feral", "Restoration"],
  paladin: ["Holy", "Protection", "Retribution"],
  shaman: ["Elemental", "Enhancement", "Restoration"],
};

const CLASS_DEFAULT_BRANCH: Record<ClassId, string> = {
  warrior: "Protection",
  mage: "Frost",
  rogue: "Combat",
  priest: "Holy",
  hunter: "Marksmanship",
  warlock: "Affliction",
  druid: "Feral",
  paladin: "Protection",
  shaman: "Enhancement",
};

const CLASS_BASELINE_STRENGTHS: Record<ClassId, string[]> = {
  warrior: ["High HP pool", "Strong melee burst", "Plate armor mitigation"],
  mage: ["Best-in-class kiting", "Reliable food + water self-supply", "Strong AoE"],
  rogue: ["Stealth opens safe pulls", "Highest single-target burst", "Easy disengage"],
  priest: ["Class-defining self-healing", "Bubble + Fade saves runs", "Strong group value"],
  hunter: ["Pet tanks risky pulls", "Range pulls keep distance", "Best solo class"],
  warlock: ["Pet sustains while you regen", "Healthstones add a free panic button", "Lifelong drain self-sustain"],
  druid: ["Bear form mitigation", "Travel form safety", "Self-healing in any spec"],
  paladin: ["Plate + bubble safety net", "Lay on Hands as a panic save", "Auras for any group"],
  shaman: ["Reincarnation as last-resort save", "Totems cover gaps in damage and heal", "Self-heal between pulls"],
};

const CLASS_BASELINE_WEAKNESSES: Record<ClassId, string[]> = {
  warrior: ["Downtime between pulls", "Bad vs caster trains", "Gear-dependent damage"],
  mage: ["Fragile when caught", "Mana-gated leveling", "Cloth armor on melee adds"],
  rogue: ["No real self-heal", "Stealth detection ruins openers", "Risky vs casters"],
  priest: ["Slow solo killing", "Very gear-dependent damage", "Mana-gated"],
  hunter: ["Pet management adds attention load", "Dead pet = vulnerable", "Tight ammo / arrow logistics"],
  warlock: ["Soulshard logistics", "Pet pathing risk on adds", "Slow burst windows"],
  druid: ["Form swapping demands attention", "Spread between gear sets", "Slow burst"],
  paladin: ["Slow solo killing", "Mana-gated sustain", "Limited burst options"],
  shaman: ["Totem placement adds attention load", "Mana-gated burst", "Mail armor only"],
};

function detectBranchFromText(text: string, branches: string[]): string | null {
  const lc = text.toLowerCase();
  for (const branch of branches) {
    if (lc.includes(branch.toLowerCase())) return branch;
  }
  return null;
}

/**
 * If AI prose names a spec tree (e.g. "Protection") that does not match the player-facing
 * primary tree (e.g. Arms from the headline), treat it as a contradiction and drop it so we
 * can fall back to summary or a template (fixes Arms headline + Protection in whyDistinct).
 */
function proseMatchesPrimaryTree(prose: string, primary: string, branches: readonly string[]): boolean {
  const t = prose.toLowerCase();
  const mentioned = branches.filter((b) => t.includes(b.toLowerCase()));
  if (mentioned.length === 0) return true;
  return mentioned.every((b) => b === primary);
}

/**
 * Derive a spec summary preferring AI-provided `signature` values, then
 * falling back to heuristic detection from talent rows and a curated class
 * baseline. Always returns sensible defaults so the UI is never empty.
 */
export function buildSpecSummary(input: SpecSummaryInput): SpecSummary {
  const branches = CLASS_BRANCHES[input.classId];
  const fromDestinyText = [input.destinyHeadline, input.destinySubline, input.destinyTierProse]
    .filter((s) => (s ?? "").trim().length > 0)
    .join(" ");
  /** Headline/subline beat a mismatched `signature.tree` (common AI drift). */
  const headlineBranch = detectBranchFromText(fromDestinyText, branches);
  const counts = new Map<string, number>(branches.map((b) => [b, 0]));

  // Prefer explicit AI tree allocations when present.
  for (const row of input.talents?.treeAllocations ?? []) {
    const branch = (row.branch ?? "").trim();
    if (!branches.includes(branch)) continue;
    const points = typeof row.points === "number" && Number.isFinite(row.points) ? Math.max(0, Math.round(row.points)) : 0;
    counts.set(branch, points);
  }

  for (const pick of input.talents?.keyPicks ?? []) {
    const haystack = `${pick.tier ?? ""} ${pick.name ?? ""} ${pick.rationale ?? ""}`;
    const branch = detectBranchFromText(haystack, branches);
    if (branch) counts.set(branch, (counts.get(branch) ?? 0) + 1);
  }

  let detected = "";
  let detectedCount = 0;
  for (const [branch, count] of counts) {
    if (count > detectedCount) {
      detected = branch;
      detectedCount = count;
    }
  }

  const aiBranch = input.signature?.tree?.branch?.trim();
  const treeBranch = headlineBranch || aiBranch || detected || CLASS_DEFAULT_BRANCH[input.classId];

  let totalCount = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  const aiWeight = typeof input.signature?.tree?.weight === "number" ? input.signature.tree.weight : null;
  if (totalCount === 0 && aiWeight !== null) {
    // If AI gave branch+weight but not per-tree counts, synthesize readable bars (51 points @ level 60).
    const primaryPts = Math.max(0, Math.min(51, Math.round(aiWeight * 51)));
    counts.set(treeBranch, primaryPts);
    totalCount = primaryPts;
  }
  const heuristicWeight = totalCount > 0 ? (counts.get(treeBranch) ?? 0) / totalCount : 0;
  const treeWeight = aiWeight !== null ? Math.max(0, Math.min(1, aiWeight)) : heuristicWeight;

  const treeCounts = branches.map((branch) => ({ branch, count: counts.get(branch) ?? 0 }));

  const strengths = (input.signature?.strengths ?? []).filter(Boolean);
  const weaknesses = (input.signature?.weaknesses ?? []).filter(Boolean);

  const rawWhy = (input.signature?.whyDistinct ?? "").trim();
  const summaryLine = (input.talents?.summary ?? "").trim();
  const useRawWhy = Boolean(rawWhy && proseMatchesPrimaryTree(rawWhy, treeBranch, branches));
  const useSummary = Boolean(
    summaryLine && proseMatchesPrimaryTree(summaryLine, treeBranch, branches) && !useRawWhy,
  );
  const whyDistinct = useRawWhy
    ? rawWhy
    : useSummary
      ? summaryLine
      : `This build centers on ${treeBranch} for ${input.destinyHeadline?.trim() || "this run"}: control pulls, use your toolkit deliberately, and avoid the path that only looks safe on paper.`;

  return {
    treeBranch,
    treeWeight,
    treeCounts,
    strengths: strengths.length ? strengths.slice(0, 5) : CLASS_BASELINE_STRENGTHS[input.classId],
    weaknesses: weaknesses.length ? weaknesses.slice(0, 5) : CLASS_BASELINE_WEAKNESSES[input.classId],
    whyDistinct,
  };
}
