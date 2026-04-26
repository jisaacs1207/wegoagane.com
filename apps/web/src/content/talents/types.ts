/**
 * Canonical Classic Era (1.12.1) talent grid types.
 *
 * One `ClassTalents` record per class. The renderer (`TalentTreeView`) uses these to draw the
 * authentic 7-tier x 4-column grid with prereq arrows. AI-generated talent names from the build
 * plan are snapped onto cells by case-insensitive name + alias match; anything that doesn't match
 * lands in the "Cross-tree picks" side rail with an explanation tooltip.
 *
 * Authoring conventions:
 * - `id` is `<branchSlug>.<lowercase_dot_separated>` so prereq arrows can reference cells by id.
 * - `name` is the canonical Classic Era display name. `aliases` cover common AI variations
 *   (legacy naming, hyphenation, retail variants).
 * - `iconKey` maps to `talentIconMap` for the small icon. Use a class-themed fallback when no
 *   specific icon exists; the renderer hides the icon if the key is missing.
 * - `tier` 1..7 (paladins/druids/etc may end at 7 in 1.12), `column` 1..4.
 * - `maxRank` is the talent's rank cap.
 * - `prereqId` is the `id` of the cell that must be filled before this one becomes available
 *   (1.12 talent point graph). Tier-3+ cells with no `prereqId` are independent.
 */

export type TalentTreeBranch = {
  /** Display branch name, e.g. "Feral", "Marksmanship". */
  branch: string;
  /** Branch slug used in cell ids; lowercased, no spaces. */
  slug: string;
  /** Optional themed background image URL the renderer can drop behind the grid. */
  background?: string;
  talents: TalentCell[];
};

export type TalentCell = {
  id: string;
  name: string;
  aliases?: string[];
  iconKey: string;
  tier: number;
  column: number;
  maxRank: number;
  prereqId?: string;
};

export type ClassTalents = {
  classId:
    | "druid"
    | "hunter"
    | "mage"
    | "paladin"
    | "priest"
    | "rogue"
    | "shaman"
    | "warlock"
    | "warrior";
  trees: TalentTreeBranch[];
};

/**
 * Resolve an AI-supplied talent name (case-insensitive) against a class grid.
 * Returns the matching cell + which tree branch it belongs to, or null when not on the grid.
 */
export function resolveTalentByName(
  data: ClassTalents,
  rawName: string,
): { tree: TalentTreeBranch; cell: TalentCell } | null {
  if (!rawName || typeof rawName !== "string") return null;
  const needle = rawName.trim().toLowerCase();
  if (!needle) return null;
  for (const tree of data.trees) {
    for (const cell of tree.talents) {
      if (cell.name.toLowerCase() === needle) return { tree, cell };
      if (cell.aliases?.some((a) => a.toLowerCase() === needle)) return { tree, cell };
    }
  }
  return null;
}
