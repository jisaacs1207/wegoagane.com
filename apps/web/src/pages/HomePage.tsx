import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchGrowthAssignment, submitGrowthOutcome } from "../lib/recommendClient";

function sanitizeUiExperiment(payload: { headline?: string; subline?: string }) {
  const headline = payload.headline?.trim();
  const subline = payload.subline?.trim();
  const safe =
    (!headline || headline.length <= 64) && (!subline || subline.length <= 120);
  return safe ? { headline, subline } : null;
}

export function HomePage() {
  const [heroQuestion, setHeroQuestion] = useState("Choose a path");
  const [heroSub, setHeroSub] = useState("Each route is skippable where it matters — this is a living build.");
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
            <span className="entry-btn-title">Release Spirit</span>
            <span className="entry-btn-desc">I just died — memorial + next Destiny</span>
          </Link>
          <Link
            to="/draft-a-run/intent"
            className="entry-btn"
            onClick={() => {
              if (!assignmentId) return;
              void submitGrowthOutcome({ assignmentId, converted: true, outcome: { event: "home_click_draft_run" } }).catch(() => {});
            }}
          >
            <span className="entry-btn-title">Draft a Run</span>
            <span className="entry-btn-desc">I&apos;m planning — next Destiny only</span>
          </Link>
          <Link
            to="/lucky-roll"
            className="entry-btn"
            onClick={() => {
              if (!assignmentId) return;
              void submitGrowthOutcome({ assignmentId, converted: true, outcome: { event: "home_click_lucky_roll" } }).catch(() => {});
            }}
          >
            <span className="entry-btn-title">Lucky roll</span>
            <span className="entry-btn-desc">Surprise me with a full Destiny card</span>
          </Link>
        </div>
        <p style={{ margin: "18px 0 0", fontSize: 12, color: "var(--td)" }}>
          <Link to="/design/cards" style={{ color: "var(--ts)" }}>
            M2 card shells & icons (dev)
          </Link>
          {" · "}
          <Link to="/ops/feedback" style={{ color: "var(--ts)" }}>
            M10 feedback snapshot (dev)
          </Link>
          {" · "}
          <Link to="/ops/growth" style={{ color: "var(--ts)" }}>
            Growth engine status (dev)
          </Link>
        </p>
      </div>
    </div>
  );
}
