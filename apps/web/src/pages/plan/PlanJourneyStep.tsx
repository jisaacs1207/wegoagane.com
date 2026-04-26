import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BuildIntentChips } from "../../components/BuildIntentChips";
import { IdentityPortrait } from "../../components/IdentityPortrait";
import { wowPackUrl } from "../../content/identityAssets";
import { inferFactionFromRace, inferRaceFromHeadline } from "../../content/identityAssets";
import type { ClassId } from "../../icons/types";
import type { BuildIntentSignals, IntentDepth } from "../../lib/buildIntentTypes";
import { softenBuildIntentOneSlot } from "../../lib/buildIntentRecover";
import { augmentFreeformWithPower } from "../../lib/journeySignalsExtras";
import {
  destinyRecommendErrorHint,
  fetchAnalyticsConfig,
  fetchBuildCommit,
  fetchDestiny,
  fetchGrowthAssignment,
  recommendErrorSuggestsSoftenFilters,
  submitGrowthOutcome,
} from "../../lib/recommendClient";
import { debugClientIgnored } from "../../lib/clientDebug";
import { SessionKeys } from "../../lib/sessionKeys";
import { buildMemoryHints } from "../../lib/memoryProfile";
import { writeStoredDestiny } from "../../lib/flowDestinyState";
import { experimentalCohortHit } from "../../lib/experimentalLaneOffer";
import { AnalyticsEvent, trackEvent } from "../../lib/analytics";

export function PlanJourneyStep() {
  const navigate = useNavigate();
  const [seedBanner, setSeedBanner] = useState(() => Boolean(sessionStorage.getItem(SessionKeys.plan.seedDestinyId)));
  const [showConstraints, setShowConstraints] = useState(() =>
    Boolean((sessionStorage.getItem(SessionKeys.plan.freeform) ?? "").trim()),
  );
  const [freeformNote, setFreeformNote] = useState(() => sessionStorage.getItem(SessionKeys.plan.freeform) ?? "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [lastRecommendErr, setLastRecommendErr] = useState<unknown>(null);
  const [chipNonce, setChipNonce] = useState(0);
  const [experimentalOffer, setExperimentalOffer] = useState<"none" | "cohort" | "forced">("none");
  const [recommendLane, setRecommendLane] = useState<"curated" | "experimental" | null>(null);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem(SessionKeys.plan.sessionId)) {
        sessionStorage.setItem(SessionKeys.plan.sessionId, crypto.randomUUID());
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem(SessionKeys.plan.intent)) {
        navigate("/draft-a-run/intent", { replace: true });
      }
    } catch {
      navigate("/draft-a-run/intent", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    const sid = sessionStorage.getItem(SessionKeys.plan.sessionId) ?? "";
    if (!sid) return;
    void fetchAnalyticsConfig()
      .then((cfg) => {
        if (cancelled) return;
        const pct = cfg.experimentalLane?.offerPercent ?? 0;
        if (experimentalCohortHit(sid, pct)) {
          setExperimentalOffer("cohort");
          setRecommendLane("curated");
          trackEvent(AnalyticsEvent.ExperimentalLaneOfferShown, { flow: "draft_a_run", offerPercent: pct });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function onGenerate(signals: BuildIntentSignals, depth: IntentDepth) {
    const { intentDepth: _stripDepth, ...intentSignals } = signals;
    void _stripDepth;
    const sessionId = sessionStorage.getItem(SessionKeys.plan.sessionId) ?? crypto.randomUUID();
    sessionStorage.setItem(SessionKeys.plan.sessionId, sessionId);
    const intent = sessionStorage.getItem(SessionKeys.plan.intent) ?? undefined;
    const freeform = sessionStorage.getItem(SessionKeys.plan.freeform) ?? undefined;
    const ipRaw = sessionStorage.getItem(SessionKeys.plan.identityPriority);
    const identityPriority =
      ipRaw === "class_first" || ipRaw === "race_first" ? (ipRaw as "class_first" | "race_first") : undefined;

    if (experimentalOffer === "cohort" && recommendLane === null) {
      setError("Pick curated deck or experimental AI lane before generating.");
      return;
    }

    setIsGenerating(true);
    setError("");
    try {
      let seedClass: ClassId | undefined;
      let seedFaction: "horde" | "alliance" | undefined;
      const seedDestinyId = sessionStorage.getItem(SessionKeys.plan.seedDestinyId);
      if (seedDestinyId) {
        try {
          const prior = await fetchBuildCommit(seedDestinyId);
          const d = prior.payload?.destiny;
          if (d?.classId) {
            seedClass = d.classId;
            const fac = inferFactionFromRace(inferRaceFromHeadline(d.headline));
            if (fac === "horde" || fac === "alliance") seedFaction = fac;
          }
          sessionStorage.removeItem(SessionKeys.plan.seedDestinyId);
        } catch (err) {
          debugClientIgnored("plan_journey.seed_build_commit", err);
        }
      }

      const assignment = await fetchGrowthAssignment({
        sessionId,
        surface: "recommendation",
        entryPath: "draft_a_run",
      }).catch((err) => {
        debugClientIgnored("plan_journey.growth_assignment", err);
        return null;
      });

      const laneArg = recommendLane === "experimental" ? { recommendLane: "experimental" as const } : {};

      const result = await fetchDestiny({
        entryPath: "draft_a_run",
        sessionId,
        signals: {
          intent,
          freeform: augmentFreeformWithPower(freeform, SessionKeys.plan.buildIntent),
          identityPriority,
          memoryHints: buildMemoryHints(),
          recommendVariantId: assignment?.variantId ?? undefined,
          preferredClass: seedClass,
          factionPreference: seedFaction,
          ...intentSignals,
          intentDepth: depth,
          ...laneArg,
        },
      });
      setSeedBanner(false);
      writeStoredDestiny("plan", {
        sessionId: result.sessionId,
        destinyId: result.destinyId,
        output: result.output,
        intentSnapshot: { ...intentSignals, intentDepth: depth },
        experimentalLane: result.experimentalLane,
        experimentalCandidate: result.experimentalCandidate,
      });
      if (result.filterRelaxedForAi) {
        try {
          sessionStorage.setItem(SessionKeys.plan.recommendRelaxBanner, "1");
        } catch {
          /* ignore */
        }
      }
      sessionStorage.setItem(SessionKeys.plan.destinyId, result.destinyId);
      setLastRecommendErr(null);
      if (assignment) {
        void submitGrowthOutcome({
          assignmentId: assignment.assignmentId,
          converted: true,
          outcome: { event: "recommend_rendered", destinyId: result.destinyId },
        }).catch((err) => {
          debugClientIgnored("plan_journey.growth_outcome", err);
        });
      }
      // Single-page model: every roll has a stable `/build/commit/:slug` URL the moment recommend
      // returns. Skip the legacy result step entirely. `?fresh=1` tells the commit page to poll
      // build_plans + open the rename affordance; `flow=plan` keeps analytics attribution accurate.
      const slug = result.buildCommitSlug ?? null;
      if (slug) {
        try {
          sessionStorage.setItem(SessionKeys.lastBuildFlow, "plan");
        } catch {
          /* ignore */
        }
        navigate(`/build/commit/${slug}?fresh=1&flow=plan`);
      } else {
        // Defensive fallback: if for any reason the auto-commit row was not minted, fall back to
        // the legacy plan-based view path so the user is never left without a URL.
        navigate(`/build/${result.destinyId}?fresh=1&flow=plan`);
      }
    } catch (err) {
      setLastRecommendErr(err);
      setError(destinyRecommendErrorHint(err));
      if (recommendErrorSuggestsSoftenFilters(err)) {
        setExperimentalOffer("forced");
        setRecommendLane("experimental");
      }
    } finally {
      setIsGenerating(false);
    }
  }

  const filterRecoveryAction =
    lastRecommendErr && recommendErrorSuggestsSoftenFilters(lastRecommendErr)
      ? {
          label: "Soften one filter",
          onSoften: () => {
            if (softenBuildIntentOneSlot(SessionKeys.plan.buildIntent)) {
              setChipNonce((n) => n + 1);
              setError("");
              setLastRecommendErr(null);
              if (experimentalOffer === "forced") {
                setExperimentalOffer("none");
                setRecommendLane(null);
              }
            }
          },
        }
      : null;

  return (
    <div>
      <div className="flow-crumbs" aria-label="Flow navigation">
        <span className="flow-crumb">
          <Link to="/">Home</Link>
        </span>
        <span className="flow-crumb">/</span>
        <span className="flow-crumb">
          <Link to="/draft-a-run/intent">Detailed setup</Link>
        </span>
        <span className="flow-crumb">/</span>
        <span className="flow-crumb">Tune filters</span>
      </div>
      <p className="step-label" style={{ marginBottom: 6 }}>
        Draft a run · step 2 of 3
      </p>
      {seedBanner ? (
        <p className="ui-caption" style={{ marginTop: 0, marginBottom: 10 }} role="status">
          A prior committed build is set as a soft hint for class and faction on this generation. It clears after you
          generate once.
        </p>
      ) : null}
      <div className="card plan-constraints-card" style={{ marginBottom: 12 }}>
        <div className="plan-constraints-card__head">
          <IdentityPortrait
            src={wowPackUrl("Miscellaneous", "QuestionMark.png")}
            alt=""
            className="plan-constraints-card__icon"
            aria-hidden
          />
          <div>
            <p className="step-label" style={{ marginBottom: 4 }}>
              Optional notes
            </p>
            <p className="ui-caption ui-caption--xs" style={{ margin: 0 }}>
              Dealbreakers or must-haves, one place, optional.
            </p>
          </div>
          <button
            type="button"
            className={`btn-ghost plan-constraints-card__toggle ${showConstraints ? "chip-btn--on" : ""}`}
            onClick={() => setShowConstraints((v) => !v)}
          >
            {showConstraints ? "Hide" : "Add"}
          </button>
        </div>
        {showConstraints ? (
          <label className="ui-caption" style={{ display: "block" }}>
            Optional constraints
            <textarea
              value={freeformNote}
              onChange={(e) => {
                const next = e.target.value.slice(0, 120);
                setFreeformNote(next);
                try {
                  sessionStorage.setItem(SessionKeys.plan.freeform, next);
                } catch {
                  /* ignore */
                }
              }}
              placeholder="e.g. no pet micromanagement, avoid mage, prioritize sustain"
              rows={3}
              style={{ width: "100%", marginTop: 6 }}
            />
          </label>
        ) : null}
      </div>
      <BuildIntentChips
        key={chipNonce}
        storageKey={SessionKeys.plan.buildIntent}
        intentSurface="draft_a_run"
        onLeaveDetailedBuild={() => navigate("/draft-a-run/intent")}
        isGenerating={isGenerating}
        hasGenerated={false}
        filterRecoveryAction={filterRecoveryAction}
        experimentalOffer={experimentalOffer}
        recommendLane={recommendLane}
        onRecommendLaneChange={setRecommendLane}
        onGenerate={(signals, depth) => void onGenerate(signals, depth)}
      />
      {error ? (
        <p className="hero-sub" style={{ marginTop: 10 }} role="status" aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  );
}
