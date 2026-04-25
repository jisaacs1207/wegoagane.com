import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { IdentityPortrait } from "../components/IdentityPortrait";
import { wowPackUrl } from "../content/identityAssets";
import { fetchGrowthAssignment, submitGrowthOutcome } from "../lib/recommendClient";
import { debugClientIgnored } from "../lib/clientDebug";
import { SessionKeys } from "../lib/sessionKeys";

function sanitizeUiExperiment(payload: { headline?: string; subline?: string }) {
  const headline = payload.headline?.trim();
  const subline = payload.subline?.trim();
  const safe =
    (!headline || headline.length <= 64) && (!subline || subline.length <= 120);
  return safe ? { headline, subline } : null;
}

export function HomePage() {
  const [heroQuestion, setHeroQuestion] = useState("One clean decision, no noise");
  const [heroSub, setHeroSub] = useState("Pick your ritual: recover from a death, plan a run, or roll a wildcard.");
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [activeEntry, setActiveEntry] = useState<"death" | "plan" | "lucky" | null>(null);

  useEffect(() => {
    const sessionId = sessionStorage.getItem(SessionKeys.home.sessionId) ?? crypto.randomUUID();
    sessionStorage.setItem(SessionKeys.home.sessionId, sessionId);
    let assignmentId: string | null = null;
    void fetchGrowthAssignment({ sessionId, surface: "ui" })
      .then((assignment) => {
        assignmentId = assignment.assignmentId;
        setAssignmentId(assignment.assignmentId);
        const safePayload = sanitizeUiExperiment({
          headline: assignment.payload?.headline,
          subline: assignment.payload?.subline,
        });
        if (!safePayload) return;
        if (safePayload.headline) setHeroQuestion(safePayload.headline);
        if (safePayload.subline) setHeroSub(safePayload.subline);
        // Entry row titles stay fixed per route so sublines never mismatch (growth CTAs are optional copy experiments only).
      })
      .catch((err) => {
        debugClientIgnored("home.growth_assignment", err);
      });
    return () => {
      if (!assignmentId) return;
      void submitGrowthOutcome({ assignmentId, converted: false, outcome: { location: "home_unmount" } }).catch((err) => {
        debugClientIgnored("home.growth_outcome_unmount", err);
      });
    };
  }, []);

  return (
    <div>
      <div className="card">
        <p className="step-label">What brings you here?</p>
        <h1 className="hero-question">{heroQuestion}</h1>
        <p className="hero-sub">{heroSub}</p>
        <div className="entry-grid">
          <Link
            to="/release-spirit/next"
            className={`entry-btn ${activeEntry === "death" ? "entry-btn--active" : ""}`}
            style={{ ["--entry-motif-url" as string]: `url(${wowPackUrl("Spells", "HellifrePVPThrallmarFavor.png")})` }}
            onMouseEnter={() => setActiveEntry("death")}
            onMouseLeave={() => setActiveEntry(null)}
            onFocus={() => setActiveEntry("death")}
            onBlur={() => setActiveEntry(null)}
            onClick={() => {
              sessionStorage.removeItem(SessionKeys.death.buildIntent);
              sessionStorage.removeItem(SessionKeys.death.buildIntentDepth);
              sessionStorage.removeItem(SessionKeys.death.buildIntentPowerCurve);
              sessionStorage.removeItem(SessionKeys.death.generatedDestiny);
              sessionStorage.removeItem(SessionKeys.death.destinyId);
              if (!assignmentId) return;
              void submitGrowthOutcome({ assignmentId, converted: true, outcome: { event: "home_click_release_spirit" } }).catch((err) => {
                debugClientIgnored("home.growth_outcome_release_spirit", err);
              });
            }}
          >
            <IdentityPortrait src={wowPackUrl("Miscellaneous", "Tournaments_banner_Scourge.png")} alt="" className="entry-emblem" />
            <span className="entry-badges">
              <IdentityPortrait src={wowPackUrl("Abilities", "ShieldWall.png")} alt="" className="entry-badge" />
              <IdentityPortrait src={wowPackUrl("Spells", "Slow.png")} alt="" className="entry-badge" />
            </span>
            <span className="entry-btn-title">Release Spirit</span>
            <span className="entry-btn-desc">I died - fast re-entry now, with optional context if I want to tune.</span>
            <span className="entry-pill-row">
              <span className="entry-pill">Fast restart</span>
              <span className="entry-pill">Set next priority</span>
              <span className="entry-pill">Optional detail tuning</span>
            </span>
          </Link>
          <Link
            to="/draft-a-run/intent"
            className={`entry-btn ${activeEntry === "plan" ? "entry-btn--active" : ""}`}
            style={{ ["--entry-motif-url" as string]: `url(${wowPackUrl("Trade", "engineering.png")})` }}
            onMouseEnter={() => setActiveEntry("plan")}
            onMouseLeave={() => setActiveEntry(null)}
            onFocus={() => setActiveEntry("plan")}
            onBlur={() => setActiveEntry(null)}
            onClick={() => {
              sessionStorage.removeItem(SessionKeys.plan.buildIntent);
              sessionStorage.removeItem(SessionKeys.plan.buildIntentDepth);
              sessionStorage.removeItem(SessionKeys.plan.buildIntentPowerCurve);
              sessionStorage.removeItem(SessionKeys.plan.generatedDestiny);
              sessionStorage.removeItem(SessionKeys.plan.destinyId);
              if (!assignmentId) return;
              void submitGrowthOutcome({ assignmentId, converted: true, outcome: { event: "home_click_draft_run" } }).catch((err) => {
                debugClientIgnored("home.growth_outcome_draft_run", err);
              });
            }}
          >
            <IdentityPortrait src={wowPackUrl("Abilities", "SwordandBoard.png")} alt="" className="entry-emblem" />
            <span className="entry-badges">
              <IdentityPortrait src={wowPackUrl("Trade", "engineering.png")} alt="" className="entry-badge" />
              <IdentityPortrait src={wowPackUrl("Trade", "herbalism.png")} alt="" className="entry-badge" />
            </span>
            <span className="entry-btn-title">Draft a Run</span>
            <span className="entry-btn-desc">I&apos;m planning - instant generate first, then tune deeper only if needed.</span>
            <span className="entry-pill-row">
              <span className="entry-pill">Instant first draft</span>
              <span className="entry-pill">Persona-aware tuning</span>
              <span className="entry-pill">Commit artifact</span>
            </span>
          </Link>
          <Link
            to="/lucky-roll/journey"
            className={`entry-btn ${activeEntry === "lucky" ? "entry-btn--active" : ""}`}
            style={{ ["--entry-motif-url" as string]: `url(${wowPackUrl("Miscellaneous", "Dice_01.png")})` }}
            onMouseEnter={() => setActiveEntry("lucky")}
            onMouseLeave={() => setActiveEntry(null)}
            onFocus={() => setActiveEntry("lucky")}
            onBlur={() => setActiveEntry(null)}
            onClick={() => {
              sessionStorage.removeItem(SessionKeys.lucky.buildIntent);
              sessionStorage.removeItem(SessionKeys.lucky.buildIntentDepth);
              sessionStorage.removeItem(SessionKeys.lucky.buildIntentPowerCurve);
              sessionStorage.removeItem(SessionKeys.lucky.generatedDestiny);
              sessionStorage.removeItem(SessionKeys.lucky.destinyId);
              if (!assignmentId) return;
              void submitGrowthOutcome({ assignmentId, converted: true, outcome: { event: "home_click_lucky_roll" } }).catch((err) => {
                debugClientIgnored("home.growth_outcome_lucky_roll", err);
              });
            }}
          >
            <IdentityPortrait src={wowPackUrl("Miscellaneous", "Dice_01.png")} alt="" className="entry-emblem" />
            <span className="entry-badges">
              <IdentityPortrait src={wowPackUrl("Spells", "StarFire.png")} alt="" className="entry-badge" />
              <IdentityPortrait src={wowPackUrl("Abilities", "BloodFrenzy.png")} alt="" className="entry-badge" />
            </span>
            <span className="entry-btn-title">Lucky roll</span>
            <span className="entry-btn-desc">Surprise me - shortest path with safe variance.</span>
            <span className="entry-pill-row">
              <span className="entry-pill">Fastest path</span>
              <span className="entry-pill">Power curve aware</span>
              <span className="entry-pill">Commit-ready</span>
            </span>
          </Link>
        </div>
        <p className="ui-caption" style={{ margin: "18px 0 0", color: "var(--td)" }}>
          Every generation creates a bookmarkable build URL for revisits, help, and memorial updates.
        </p>
      </div>
    </div>
  );
}
