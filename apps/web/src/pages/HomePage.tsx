import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { wowPackUrl } from "../content/identityAssets";
import type { BuildIntentSignals } from "../lib/buildIntentTypes";
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
  const [heroSub, setHeroSub] = useState("Choose fast generation or detailed setup.");
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [activeEntry, setActiveEntry] = useState<"quick" | "detailed" | null>(null);

  function sample<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function seedQuickBuild() {
    const quickSignals: BuildIntentSignals = {
      statPhilosophy: [sample(["stamina_forward", "balanced", "intellect_forward"] as const)],
      professionIntents: [sample(["engineering_outs", "herbalism_alchemy_pair", "mining_engineering_pair"] as const)],
      buildVectors: [
        sample(["solo", "hybrid", "ranged", "melee", "caster"] as const),
        sample(["tank", "heal", "mana", "rage", "group_ok"] as const),
      ],
      raceMode: sample(["signal_inferred", "surprise"] as const),
    };
    sessionStorage.setItem(SessionKeys.lucky.buildIntent, JSON.stringify(quickSignals));
    sessionStorage.setItem(SessionKeys.lucky.buildIntentDepth, "quick");
  }

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
            to="/lucky-roll/journey?quick=1"
            className={`entry-btn ${activeEntry === "quick" ? "entry-btn--active" : ""}`}
            style={{ ["--entry-motif-url" as string]: `url(${wowPackUrl("Miscellaneous", "Dice_01.png")})` }}
            onMouseEnter={() => setActiveEntry("quick")}
            onMouseLeave={() => setActiveEntry(null)}
            onFocus={() => setActiveEntry("quick")}
            onBlur={() => setActiveEntry(null)}
            onClick={() => {
              sessionStorage.removeItem(SessionKeys.lucky.generatedDestiny);
              sessionStorage.removeItem(SessionKeys.lucky.destinyId);
              seedQuickBuild();
              if (!assignmentId) return;
              void submitGrowthOutcome({ assignmentId, converted: true, outcome: { event: "home_click_quick_build" } }).catch((err) => {
                debugClientIgnored("home.growth_outcome_quick_build", err);
              });
            }}
          >
            <span className="entry-btn-title">Quick build</span>
            <span className="entry-btn-desc">One tap — we roll safe filters and generate a run you can save.</span>
            <span className="entry-pill-row">
              <span className="entry-pill">Fastest</span>
              <span className="entry-pill">Commit-ready</span>
            </span>
          </Link>
          <Link
            to="/draft-a-run/intent"
            className={`entry-btn ${activeEntry === "detailed" ? "entry-btn--active" : ""}`}
            style={{ ["--entry-motif-url" as string]: `url(${wowPackUrl("Trade", "engineering.png")})` }}
            onMouseEnter={() => setActiveEntry("detailed")}
            onMouseLeave={() => setActiveEntry(null)}
            onFocus={() => setActiveEntry("detailed")}
            onBlur={() => setActiveEntry(null)}
            onClick={() => {
              sessionStorage.removeItem(SessionKeys.plan.intent);
              sessionStorage.removeItem(SessionKeys.plan.intentGoalId);
              sessionStorage.removeItem(SessionKeys.plan.identityPriority);
              sessionStorage.removeItem(SessionKeys.plan.freeform);
              sessionStorage.removeItem(SessionKeys.plan.buildIntent);
              sessionStorage.removeItem(SessionKeys.plan.buildIntentDepth);
              sessionStorage.removeItem(SessionKeys.plan.buildIntentPowerCurve);
              sessionStorage.removeItem(SessionKeys.plan.generatedDestiny);
              sessionStorage.removeItem(SessionKeys.plan.destinyId);
              if (!assignmentId) return;
              void submitGrowthOutcome({ assignmentId, converted: true, outcome: { event: "home_click_detailed_build" } }).catch((err) => {
                debugClientIgnored("home.growth_outcome_detailed_build", err);
              });
            }}
          >
            <span className="entry-btn-title">Detailed build</span>
            <span className="entry-btn-desc">Goal, identity order, filters — you steer every step, then save.</span>
            <span className="entry-pill-row">
              <span className="entry-pill">Full control</span>
              <span className="entry-pill">Filters + review</span>
            </span>
          </Link>
        </div>
        <div className="flow-nav" style={{ marginTop: 12 }}>
          <Link to="/release-spirit/next" className="btn-ghost">
            I died — pick up from here
          </Link>
        </div>
        <p className="ui-caption" style={{ margin: "18px 0 0", color: "var(--td)" }}>
          Saved builds get a stable link for guides, guild help, and memorials.
        </p>
      </div>
    </div>
  );
}
