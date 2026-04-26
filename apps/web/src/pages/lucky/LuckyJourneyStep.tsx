import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BuildIntentChips } from "../../components/BuildIntentChips";
import type { IntentDepth } from "../../components/intent/intentOptions";
import { IdentityPortrait } from "../../components/IdentityPortrait";
import { wowPackUrl } from "../../content/identityAssets";
import type { BuildIntentSignals } from "../../lib/buildIntentTypes";
import { softenBuildIntentOneSlot } from "../../lib/buildIntentRecover";
import { augmentNextSignalWithPower } from "../../lib/journeySignalsExtras";
import {
  destinyRecommendErrorHint,
  fetchAnalyticsConfig,
  fetchDestiny,
  fetchGrowthAssignment,
  recommendErrorSuggestsSoftenFilters,
  submitGrowthOutcome,
} from "../../lib/recommendClient";
import { debugClientIgnored } from "../../lib/clientDebug";
import { SessionKeys } from "../../lib/sessionKeys";
import { buildMemoryHints } from "../../lib/memoryProfile";
import { readBuildIntent } from "../../lib/readBuildIntent";
import { writeStoredDestiny } from "../../lib/flowDestinyState";
import { experimentalCohortHit } from "../../lib/experimentalLaneOffer";
import { AnalyticsEvent, trackEvent } from "../../lib/analytics";

export function LuckyJourneyStep() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quickEntry = searchParams.get("quick") === "1";
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [lastRecommendErr, setLastRecommendErr] = useState<unknown>(null);
  const [chipNonce, setChipNonce] = useState(0);
  const [experimentalOffer, setExperimentalOffer] = useState<"none" | "cohort" | "forced">("none");
  const [recommendLane, setRecommendLane] = useState<"curated" | "experimental" | null>(null);
  const [quickAutoTriggered, setQuickAutoTriggered] = useState(false);

  useEffect(() => {
    sessionStorage.removeItem(SessionKeys.lucky.generatedDestiny);
    sessionStorage.removeItem(SessionKeys.lucky.destinyId);
  }, []);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem(SessionKeys.lucky.sessionId)) {
        sessionStorage.setItem(SessionKeys.lucky.sessionId, crypto.randomUUID());
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const sid = sessionStorage.getItem(SessionKeys.lucky.sessionId) ?? "";
    if (!sid) return;
    void fetchAnalyticsConfig()
      .then((cfg) => {
        if (cancelled) return;
        const pct = cfg.experimentalLane?.offerPercent ?? 0;
        if (experimentalCohortHit(sid, pct)) {
          setExperimentalOffer("cohort");
          setRecommendLane("curated");
          trackEvent(AnalyticsEvent.ExperimentalLaneOfferShown, { flow: "lucky_roll", offerPercent: pct });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const onGenerate = useCallback(
    async (signals: BuildIntentSignals, depth: IntentDepth) => {
      const { intentDepth: _ignored, ...intentWithoutDepth } = signals;
      void _ignored;
      const sessionId = sessionStorage.getItem(SessionKeys.lucky.sessionId) ?? crypto.randomUUID();
      sessionStorage.setItem(SessionKeys.lucky.sessionId, sessionId);

      if (experimentalOffer === "cohort" && recommendLane === null) {
        setError("Pick curated deck or experimental AI lane before generating.");
        return;
      }

      setIsGenerating(true);
      setError("");
      try {
        const assignment = await fetchGrowthAssignment({
          sessionId,
          surface: "recommendation",
          entryPath: "lucky_roll",
        }).catch((err) => {
          debugClientIgnored("lucky_journey.growth_assignment", err);
          return null;
        });

        const laneArg = recommendLane === "experimental" ? { recommendLane: "experimental" as const } : {};

        const result = await fetchDestiny({
          entryPath: "lucky_roll",
          sessionId,
          signals: {
            nextSignal: augmentNextSignalWithPower("Surprise me", SessionKeys.lucky.buildIntent),
            memoryHints: buildMemoryHints(),
            recommendVariantId: assignment?.variantId ?? undefined,
            ...intentWithoutDepth,
            intentDepth: depth,
            ...laneArg,
          },
        });
        writeStoredDestiny("lucky", {
          sessionId: result.sessionId,
          destinyId: result.destinyId,
          output: result.output,
          intentSnapshot: signals,
          experimentalLane: result.experimentalLane,
          experimentalCandidate: result.experimentalCandidate,
        });
        if (result.filterRelaxedForAi) {
          try {
            sessionStorage.setItem(SessionKeys.lucky.recommendRelaxBanner, "1");
          } catch {
            /* ignore */
          }
        }
        sessionStorage.setItem(SessionKeys.lucky.destinyId, result.destinyId);
        setLastRecommendErr(null);
        if (assignment) {
          void submitGrowthOutcome({
            assignmentId: assignment.assignmentId,
            converted: true,
            outcome: { event: "recommend_rendered", destinyId: result.destinyId },
          }).catch((err) => {
            debugClientIgnored("lucky_journey.growth_outcome", err);
          });
        }
        navigate("/lucky-roll/result");
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
    },
    [experimentalOffer, recommendLane, navigate],
  );

  useEffect(() => {
    if (quickAutoTriggered || isGenerating) return;
    if (searchParams.get("quick") !== "1") return;
    const seeded = readBuildIntent(SessionKeys.lucky.buildIntent);
    if (
      (seeded.statPhilosophy?.length ?? 0) === 0 &&
      (seeded.professionIntents?.length ?? 0) === 0 &&
      (seeded.buildVectors?.length ?? 0) === 0
    ) {
      return;
    }
    setQuickAutoTriggered(true);
    void onGenerate(seeded, "quick");
  }, [searchParams, quickAutoTriggered, isGenerating, onGenerate]);

  const filterRecoveryAction =
    lastRecommendErr && recommendErrorSuggestsSoftenFilters(lastRecommendErr)
      ? {
          label: "Soften one filter",
          onSoften: () => {
            if (softenBuildIntentOneSlot(SessionKeys.lucky.buildIntent)) {
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

  if (quickEntry && !error) {
    return (
      <div>
        <div className="flow-crumbs" aria-label="Flow navigation">
          <span className="flow-crumb">
            <Link to="/">Home</Link>
          </span>
          <span className="flow-crumb">/</span>
          <span className="flow-crumb">Quick build</span>
        </div>
        <div className="card" style={{ marginBottom: 12 }}>
          <p className="step-label">Lucky roll</p>
          <h1 className="hero-question">Forging your quick build...</h1>
          <p className="hero-sub" style={{ marginBottom: 0 }}>
            Rolling HC-safe filters and generating your run now.
          </p>
          <div className="lucky-intro-motif" aria-hidden>
            <IdentityPortrait src={wowPackUrl("Miscellaneous", "Dice_02.png")} alt="" className="lucky-intro-motif__img" />
          </div>
          <div className="flow-nav" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn-ghost"
              disabled={isGenerating}
              onClick={() => {
                const seeded = readBuildIntent(SessionKeys.lucky.buildIntent);
                setQuickAutoTriggered(true);
                void onGenerate(seeded, "quick");
              }}
            >
              {isGenerating ? "Generating..." : "Retry quick build"}
            </button>
            <Link to="/lucky-roll/journey" className="btn-ghost">
              Open setup instead
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flow-crumbs" aria-label="Flow navigation">
        <span className="flow-crumb">
          <Link to="/">Home</Link>
        </span>
        <span className="flow-crumb">/</span>
        <span className="flow-crumb">Quick build setup</span>
      </div>
      <div className="card" style={{ marginBottom: 12 }}>
        <p className="step-label">Lucky roll</p>
        <h1 className="hero-question">Set your run priorities</h1>
        <p className="hero-sub" style={{ marginBottom: 0 }}>
          Fast path: pick priorities and generate a commit-ready run.
        </p>
        <div className="lucky-intro-motif" aria-hidden>
          <IdentityPortrait src={wowPackUrl("Miscellaneous", "Dice_02.png")} alt="" className="lucky-intro-motif__img" />
        </div>
      </div>
      <BuildIntentChips
        key={chipNonce}
        storageKey={SessionKeys.lucky.buildIntent}
        intentSurface="lucky_roll"
        isGenerating={isGenerating}
        hasGenerated={false}
        filterRecoveryAction={filterRecoveryAction}
        experimentalOffer={experimentalOffer}
        recommendLane={recommendLane}
        onRecommendLaneChange={setRecommendLane}
        onGenerate={(signals, depth) => {
          void onGenerate(signals, depth);
        }}
      />
      {error ? (
        <p className="hero-sub" style={{ marginTop: 10 }} role="status" aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  );
}
