import type { CSSProperties } from "react";
import "./talent-path.css";
import type { ClassId } from "../../icons/types";
import { accentForTalentBranch } from "../../lib/talentPathBranchColors";

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

export type TalentLevelPathViewProps = {
  classId: ClassId;
  steps: LevelTalentStep[];
  buildIntentSummary?: string;
  summary?: string;
  loading: boolean;
};

export function TalentLevelPathView(props: TalentLevelPathViewProps) {
  const { classId, steps, buildIntentSummary, summary, loading } = props;
  const hasSteps = steps.length > 0;

  return (
    <div className={`talent-path ${loading ? "talent-path--loading" : ""}`}>
      <div className="talent-path__head">
        <div>
          <p className="step-label" style={{ margin: 0 }}>
            Talent path
          </p>
          <p className="talent-path__sub">Classic Era — one point per level from 10 → 60 (51 total)</p>
        </div>
        <div className="talent-path__status" role="status" aria-live="polite">
          {loading ? (
            <span className="talent-path__pulse-wrap">
              <span className="talent-path__pulse-dot" aria-hidden />
              <span className="talent-path__pulse-dot talent-path__pulse-dot--delay" aria-hidden />
              <span className="talent-path__pulse-dot talent-path__pulse-dot--delay2" aria-hidden />
              <span className="talent-path__pulse-label">Building level-by-level path…</span>
            </span>
          ) : hasSteps ? (
            <span className="talent-path__count">{steps.length} steps</span>
          ) : (
            <span className="talent-path__muted">No path in this plan yet</span>
          )}
        </div>
      </div>

      {buildIntentSummary && !loading ? (
        <p className="talent-path__intent">{buildIntentSummary}</p>
      ) : null}
      {!buildIntentSummary && summary && !loading ? (
        <p className="talent-path__intent talent-path__intent--muted">{summary}</p>
      ) : null}

      {loading ? (
        <div className="talent-path__skeleton" aria-hidden>
          <div className="talent-path__skeleton-track">
            <div className="talent-path__skeleton-shimmer" />
          </div>
        </div>
      ) : null}

      {hasSteps ? (
        <div className="talent-path__scroller" tabIndex={0} role="region" aria-label="Talent choices by level">
          <div className="talent-path__rail">
            {steps.map((s, idx) => {
              const accent = accentForTalentBranch(classId, s.branch);
              return (
                <details key={`${s.level}-${s.talent}-${idx}`} className="talent-path__step">
                  <summary
                    className="talent-path__summary"
                    style={
                      {
                        "--tp-accent-fg": accent.fg,
                        "--tp-accent-border": accent.border,
                        "--tp-accent-bg": accent.softBg,
                      } as CSSProperties
                    }
                  >
                    <span className="talent-path__lvl">L{s.level}</span>
                    <div className="talent-path__summary-main">
                      <span className="talent-path__branch">{s.branch}</span>
                      <span className="talent-path__talent">
                        {s.talent}
                        {s.rankAfter ? <span className="talent-path__rank"> · R{s.rankAfter}</span> : null}
                      </span>
                    </div>
                  </summary>
                  <div className="talent-path__body">
                    {s.rationale ? <p className="talent-path__why">{s.rationale}</p> : null}
                    {s.alternatives && s.alternatives.length > 0 ? (
                      <div className="talent-path__alts">
                        <p className="talent-path__alts-label">Other picks here</p>
                        <ul>
                          {s.alternatives.map((a, i) => (
                            <li key={`${a.talent}-${i}`}>
                              <strong style={{ color: accent.fg }}>
                                {a.talent}
                                {a.branch ? ` (${a.branch})` : ""}
                              </strong>
                              {" — "}
                              {a.tradeoff}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      ) : !loading ? (
        <p className="talent-path__empty">When the plan returns, each level from 10 onward appears here as a colored chip keyed to its tree.</p>
      ) : null}
    </div>
  );
}

export default TalentLevelPathView;
