export type LevelTalentStep = {
  level: number;
  branch: string;
  talent: string;
  rankAfter?: number;
  rationale?: string;
  alternatives?: Array<{ talent: string; branch?: string; tradeoff: string }>;
};

type PathRow = { level?: number; branch?: string; talent?: string; rank?: number; rationale?: string };

/** Prefer dedicated second-pass rows; else flatten legacy `path` for the same UI. */
export function deriveLevelTalentSteps(
  levelByLevel?: LevelTalentStep[] | null,
  path?: PathRow[] | null,
): LevelTalentStep[] {
  if (levelByLevel && levelByLevel.length > 0) {
    return [...levelByLevel].sort((a, b) => a.level - b.level);
  }
  if (!path?.length) return [];
  return [...path]
    .filter((p) => p.level != null && p.branch && p.talent)
    .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
    .map((p) => ({
      level: p.level as number,
      branch: String(p.branch),
      talent: String(p.talent),
      rankAfter: p.rank,
      rationale: p.rationale,
    }));
}
