import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BuildIntentChips } from "../../components/BuildIntentChips";
import { inferFactionFromRace, inferRaceFromHeadline } from "../../content/identityAssets";
import type { ClassId } from "../../icons/types";
import type { BuildIntentSignals } from "../../lib/buildIntentTypes";
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
    let cancelled = false;
    const sid = sessionStorage.getItem(SessionKeys.plan.sessionId) ?? "";
    if (!sid) return;
    void fetchAnalyticsConfig()
      .then((cfg) => {
        if (cancelled) return;
        const pct = cfg.experimentalLane?.offerPercent ?? 0;
        if (experimentalCohortHit(sid, pct)) {
          setExperimentalOffer("cohort");
          trackEvent(AnalyticsEvent.ExperimentalLaneOfferShown, { flow: "draft_a_run", offerPercent: pct });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function onGenerate(signals: BuildIntentSignals) {
    const sessionId = sessionStorage.getItem(SessionKeys.plan.sessionId) ?? crypto.randomUUID();
    sessionStorage.setItem(SessionKeys.plan.sessionId, sessionId);
    const intent = sessionStorage.getItem(SessionKeys.plan.intent) ?? undefined;
    const freeform = sessionStorage.getItem(SessionKeys.plan.freeform) ?? undefined;

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
          memoryHints: buildMemoryHints(),
          recommendVariantId: assignment?.variantId ?? undefined,
          preferredClass: seedClass,
          factionPreference: seedFaction,
          ...signals,
          ...laneArg,
        },
      });
      writeStoredDestiny("plan", {
        sessionId: result.sessionId,
        destinyId: result.destinyId,
        output: result.output,
        intentSnapshot: signals,
        experimentalLane: result.experimentalLane,
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
      navigate("/draft-a-run/result");
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
      <BuildIntentChips
        key={chipNonce}
        storageKey={SessionKeys.plan.buildIntent}
        isGenerating={isGenerating}
        hasGenerated={false}
        filterRecoveryAction={filterRecoveryAction}
        experimentalOffer={experimentalOffer}
        recommendLane={recommendLane}
        onRecommendLaneChange={setRecommendLane}
        onGenerate={(signals) => void onGenerate(signals)}
      />
      {error ? (
        <p className="hero-sub" style={{ marginTop: 10 }} role="status" aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  );
}
