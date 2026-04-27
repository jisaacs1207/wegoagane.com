import { useMemo } from "react";
import "./talents.css";
import { CLASS_TALENTS, resolveTalentByName, type ClassTalents, type TalentCell } from "../../content/talents";
import type { ClassId } from "../../icons/types";
import { getTalentIconUrl } from "../../lib/talentIconMap";

/** AI build plan inputs we care about. Loose subset; everything is optional so we never crash on partial data. */
export type TalentTreeViewProps = {
  classId: ClassId;
  /** Aggregate per-branch points reported by AI ("Feral: 31"). Snapped onto canonical branch names. */
  treeAllocations?: Array<{ branch?: string; points?: number }>;
  /** AI-named picks ("Mortal Strike", "Leader of the Pack"). Resolved to grid cells via name+alias match. */
  keyPicks?: Array<{ tier?: string; name?: string; rank?: number; rationale?: string }>;
  /** Full level-up path (1.12 grid coords). Each entry is one talent point spent. */
  path?: Array<{ level?: number; branch?: string; talent?: string; rank?: number; rationale?: string }>;
  /** Optional summary string to pin under the trees. */
  summary?: string;
  /** When true, render a subdued state while the AI plan is still streaming. */
  loading?: boolean;
};

type AllocationByCellId = Record<string, number>;

type UnresolvedPick = { name: string; rank: number; rationale?: string };

type Resolution = {
  byCell: AllocationByCellId;
  unresolved: UnresolvedPick[];
};

/**
 * Resolve AI talent picks onto the canonical grid:
 * - Combine `keyPicks` and `path` (path entries are per-rank; collapse to a max-rank-per-cell map).
 * - Cells matched by name+alias get a rank fill on the grid.
 * - Anything unmatched (cross-tree, retail names, AI hallucination) becomes a chip on the side rail.
 */
function resolveSelections(data: ClassTalents, props: TalentTreeViewProps): Resolution {
  const counts: Record<string, number> = {};
  const explicit: Array<{ name: string; rank: number; rationale?: string }> = [];

  // Path entries: each entry is +1 rank. Rank = sum of entries with same talent name (cap at maxRank later).
  for (const entry of props.path ?? []) {
    if (!entry?.talent) continue;
    const key = entry.talent.trim().toLowerCase();
    counts[key] = (counts[key] ?? 0) + Math.max(1, entry.rank ?? 1);
    explicit.push({ name: entry.talent, rank: counts[key]!, rationale: entry.rationale });
  }

  // Key picks: explicit final-rank statements. They override path counts when higher.
  for (const pick of props.keyPicks ?? []) {
    if (!pick?.name) continue;
    const key = pick.name.trim().toLowerCase();
    const claimed = pick.rank ?? counts[key] ?? 1;
    counts[key] = Math.max(counts[key] ?? 0, claimed);
    explicit.push({ name: pick.name, rank: counts[key]!, rationale: pick.rationale });
  }

  const byCell: AllocationByCellId = {};
  const unresolved: UnresolvedPick[] = [];

  for (const [name, rank] of Object.entries(counts)) {
    const hit = resolveTalentByName(data, name);
    if (hit) {
      const capped = Math.min(rank, hit.cell.maxRank);
      byCell[hit.cell.id] = Math.max(byCell[hit.cell.id] ?? 0, capped);
    } else {
      unresolved.push({ name, rank });
    }
  }

  return { byCell, unresolved };
}

/**
 * Compute total points spent in a branch by summing resolved cell ranks. We don't trust the AI's
 * `treeAllocations` numbers blindly because they often disagree with `path` entry counts; the
 * resolved ranks are authoritative.
 */
function computeBranchPoints(data: ClassTalents, byCell: AllocationByCellId): Record<string, number> {
  const out: Record<string, number> = {};
  for (const tree of data.trees) {
    let total = 0;
    for (const cell of tree.talents) total += byCell[cell.id] ?? 0;
    out[tree.slug] = total;
  }
  return out;
}

/** Geometry helper: cell center given (tier, column) inside a tree grid. */
function cellCenter(tier: number, column: number, cellSize: number, gap: number) {
  // Column 1..4 -> 0-indexed for px math.
  const col = column - 1;
  const row = tier - 1;
  return {
    x: col * (cellSize + gap) + cellSize / 2,
    y: row * (cellSize + gap) + cellSize / 2,
  };
}

function PrereqArrows({ tree, cellSize, gap }: { tree: ClassTalents["trees"][number]; cellSize: number; gap: number }) {
  const totalWidth = cellSize * 4 + gap * 3;
  const totalHeight = cellSize * 7 + gap * 6 + 4; // +4 padding-top
  const idMap = new Map(tree.talents.map((c) => [c.id, c]));
  const paths: string[] = [];
  for (const cell of tree.talents) {
    if (!cell.prereqId) continue;
    const src = idMap.get(cell.prereqId);
    if (!src) continue;
    const a = cellCenter(src.tier, src.column, cellSize, gap);
    const b = cellCenter(cell.tier, cell.column, cellSize, gap);
    // Simple right-angle path with rounded knee for a slightly classic feel.
    const midY = (a.y + b.y) / 2;
    paths.push(`M ${a.x} ${a.y + cellSize / 2 - 6} L ${a.x} ${midY} L ${b.x} ${midY} L ${b.x} ${b.y - cellSize / 2 + 6}`);
  }
  if (paths.length === 0) return null;
  return (
    <svg className="talent-tree__arrows" viewBox={`0 0 ${totalWidth} ${totalHeight}`} aria-hidden="true">
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

function GridCell({ cell, classId, rank }: { cell: TalentCell; classId: ClassId; rank: number }) {
  const filled = rank > 0;
  const url = getTalentIconUrl(cell.name, classId);
  const style: React.CSSProperties = {
    gridColumnStart: cell.column,
    gridRowStart: cell.tier,
  };
  return (
    <div
      className={`talent-cell ${filled ? "talent-cell--filled" : "talent-cell--dim"}`}
      style={style}
      title={`${cell.name} (${rank}/${cell.maxRank})`}
      tabIndex={0}
      role="img"
      aria-label={`${cell.name}, rank ${rank} of ${cell.maxRank}`}
    >
      <img src={url} alt="" className="talent-cell__icon" loading="lazy" />
      <span className="talent-cell__rank">{rank > 0 ? `${rank}/${cell.maxRank}` : ""}</span>
      <span className="talent-cell__name">{cell.name}</span>
    </div>
  );
}

function TreeBranch({
  tree,
  classId,
  byCell,
  totalPoints,
}: {
  tree: ClassTalents["trees"][number];
  classId: ClassId;
  byCell: AllocationByCellId;
  totalPoints: number;
}) {
  // Ensure the SVG arrows + cell grid use matching geometry.
  const cellSize = 64;
  const gap = 12;
  return (
    <div className="talent-tree">
      <div className="talent-tree__header">
        <span className="talent-tree__name">{tree.branch}</span>
        <span className="talent-tree__points">
          <span className="talent-tree__points-fill">{totalPoints}</span> points
        </span>
      </div>
      <div className="talent-tree__grid-wrap">
        <PrereqArrows tree={tree} cellSize={cellSize} gap={gap} />
        <div className="talent-tree__grid">
          {tree.talents.map((cell) => (
            <GridCell key={cell.id} cell={cell} classId={classId} rank={byCell[cell.id] ?? 0} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CrossTreeRail({ items, classId }: { items: UnresolvedPick[]; classId: ClassId }) {
  if (items.length === 0) return null;
  return (
    <div className="talent-cross-rail" role="region" aria-label="Cross-tree picks">
      <div className="talent-cross-rail__label">Cross-tree picks</div>
      <div className="talent-cross-rail__list">
        {items.map((it) => (
          <span key={it.name} className="talent-cross-rail__chip" title="AI suggested but not on this canonical grid.">
            <img src={getTalentIconUrl(it.name, classId)} alt="" />
            <span>{it.name}</span>
            <span className="talent-cross-rail__chip-rank">x{it.rank}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function TalentTreeView(props: TalentTreeViewProps) {
  const data = CLASS_TALENTS[props.classId as keyof typeof CLASS_TALENTS] as ClassTalents | undefined;
  const resolution = useMemo(() => (data ? resolveSelections(data, props) : { byCell: {}, unresolved: [] }), [data, props]);
  const branchPoints = useMemo(() => (data ? computeBranchPoints(data, resolution.byCell) : {}), [data, resolution.byCell]);

  if (!data) {
    return (
      <div className="talent-view talent-view--missing">
        <div className="talent-view__header">
          <span className="talent-view__title">Talent tree not yet authored for this class</span>
        </div>
      </div>
    );
  }

  const totalPoints = Object.values(branchPoints).reduce((acc, n) => acc + n, 0);
  const unresolved = resolution.unresolved;
  const showLoadingHint = props.loading && totalPoints === 0;
  const showEmptyPlacedHint = !props.loading && totalPoints === 0;
  return (
    <div className={`talent-view ${props.loading ? "talent-view--loading" : ""}`}>
      <div className="talent-view__header">
        <span className="talent-view__title">Talent tree</span>
        <span className="talent-view__meta">
          {totalPoints > 0
            ? `${totalPoints} points placed`
            : showLoadingHint
              ? "AI is still finalising your talent path"
              : showEmptyPlacedHint
                ? unresolved.length
                  ? `0 on-grid points — see cross-tree ${unresolved.length === 1 ? "pick" : "picks"}`
                  : "0 points matched the Classic 1.12 grid (names in the plan may not match the sheet)"
                : ""}
        </span>
      </div>
      <div className="talent-view__grid-row">
        {data.trees.map((tree) => (
          <TreeBranch
            key={tree.slug}
            tree={tree}
            classId={props.classId}
            byCell={resolution.byCell}
            totalPoints={branchPoints[tree.slug] ?? 0}
          />
        ))}
      </div>
      <CrossTreeRail items={resolution.unresolved} classId={props.classId} />
      <div className="talent-view__legend">
        <span>
          <span className="talent-view__legend-swatch talent-view__legend-swatch--filled" /> Filled cell shows rank/max
        </span>
        <span>
          <span className="talent-view__legend-swatch talent-view__legend-swatch--dim" /> Dimmed cell is on the grid but unspent
        </span>
      </div>
      {props.summary ? <p className="talent-view__summary">{props.summary}</p> : null}
    </div>
  );
}

export default TalentTreeView;
