import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { IdentityPortrait } from "../components/IdentityPortrait";
import { wowPackUrl } from "../content/identityAssets";
import { fetchGrowthAssignment, submitGrowthOutcome } from "../lib/recommendClient";

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

  useEffect(() => {
    const sessionId = sessionStorage.getItem("session.id") ?? crypto.randomUUID();
    sessionStorage.setItem("session.id", sessionId);
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
      .catch(() => {
        // Keep baseline copy if assignment fails.
      });
    return () => {
      if (!assignmentId) return;
      void submitGrowthOutcome({ assignmentId, converted: false, outcome: { location: "home_unmount" } }).catch(() => {});
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
            to="/release-spirit/mood"
            className="entry-btn"
            onClick={() => {
              if (!assignmentId) return;
              void submitGrowthOutcome({ assignmentId, converted: true, outcome: { event: "home_click_release_spirit" } }).catch(() => {});
            }}
          >
            <span className="entry-icon-row">
              <IdentityPortrait src={wowPackUrl("Miscellaneous", "Tournaments_banner_Scourge.png")} alt="" className="entry-icon" />
              <IdentityPortrait src={wowPackUrl("Spells", "HellifrePVPThrallmarFavor.png")} alt="" className="entry-icon" />
              <IdentityPortrait src={wowPackUrl("Abilities", "ShieldWall.png")} alt="" className="entry-icon" />
            </span>
            <span className="entry-btn-title">Release Spirit</span>
            <span className="entry-btn-desc">I died — capture what happened, then tune the next run with intent.</span>
            <span className="entry-pill-row">
              <span className="entry-pill">Process the death</span>
              <span className="entry-pill">Set next priority</span>
              <span className="entry-pill">Retool + commit</span>
            </span>
          </Link>
          <Link
            to="/draft-a-run/intent"
            className="entry-btn"
            onClick={() => {
              if (!assignmentId) return;
              void submitGrowthOutcome({ assignmentId, converted: true, outcome: { event: "home_click_draft_run" } }).catch(() => {});
            }}
          >
            <span className="entry-icon-row">
              <IdentityPortrait src={wowPackUrl("Trade", "engineering.png")} alt="" className="entry-icon" />
              <IdentityPortrait src={wowPackUrl("Trade", "herbalism.png")} alt="" className="entry-icon" />
              <IdentityPortrait src={wowPackUrl("Abilities", "SwordandBoard.png")} alt="" className="entry-icon" />
            </span>
            <span className="entry-btn-title">Draft a Run</span>
            <span className="entry-btn-desc">I&apos;m planning — set constraints first, then generate against them.</span>
            <span className="entry-pill-row">
              <span className="entry-pill">Intent first</span>
              <span className="entry-pill">Priority switching</span>
              <span className="entry-pill">Commit artifact</span>
            </span>
          </Link>
          <Link
            to="/lucky-roll/journey"
            className="entry-btn"
            onClick={() => {
              if (!assignmentId) return;
              void submitGrowthOutcome({ assignmentId, converted: true, outcome: { event: "home_click_lucky_roll" } }).catch(() => {});
            }}
          >
            <span className="entry-icon-row">
              <IdentityPortrait src={wowPackUrl("Miscellaneous", "Dice_01.png")} alt="" className="entry-icon" />
              <IdentityPortrait src={wowPackUrl("Spells", "StarFire.png")} alt="" className="entry-icon" />
              <IdentityPortrait src={wowPackUrl("Abilities", "BloodFrenzy.png")} alt="" className="entry-icon" />
            </span>
            <span className="entry-btn-title">Lucky roll</span>
            <span className="entry-btn-desc">Surprise me — shortest ritual with controlled chaos.</span>
            <span className="entry-pill-row">
              <span className="entry-pill">Fastest path</span>
              <span className="entry-pill">Power curve aware</span>
              <span className="entry-pill">Commit-ready</span>
            </span>
          </Link>
        </div>
        <p style={{ margin: "18px 0 0", fontSize: 12, color: "var(--td)" }}>
          Every generation creates a bookmarkable build URL for revisits, help, and memorial updates.
        </p>
      </div>
    </div>
  );
}
