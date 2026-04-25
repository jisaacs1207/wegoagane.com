import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BuildIntentChips } from "../../components/BuildIntentChips";
import type { BuildIntentSignals } from "../../lib/buildIntentTypes";
import { softenBuildIntentOneSlot } from "../../lib/buildIntentRecover";
import { augmentMoodWithPower } from "../../lib/journeySignalsExtras";
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
import { writeStoredDestiny } from "../../lib/flowDestinyState";
import { experimentalCohortHit } from "../../lib/experimentalLaneOffer";
import { AnalyticsEvent, trackEvent } from "../../lib/analytics";

function buildDeathContextFreeform() {
  const zone = sessionStorage.getItem(SessionKeys.death.detailZone)?.trim();
  const cause = sessionStorage.getItem(SessionKeys.death.detailCause)?.trim();
  const level = sessionStorage.getItem(SessionKeys.death.detailLevel)?.trim();
  const note = sessionStorage.getItem(SessionKeys.death.detailNote)?.trim();
  const bits = [zone ? `Zone: ${zone}` : "", cause ? `Cause: ${cause}` : "", level ? `Level: ${level}` : "", note ? `Note: ${note}` : ""].filter(Boolean);
  return bits.length ? bits.join(" | ").slice(0, 240) : undefined;
}

function deriveSignalBias(mood?: string, nextSignal?: string): BuildIntentSignals {
  const base: BuildIntentSignals = {};
  if (mood === "bullshit" || mood === "first_time") base.statPhilosophy = ["stamina_forward", "balanced"];
  if (mood === "long_time_coming") base.buildVectors = ["hybrid", "group_ok"];
  if (nextSignal === "safer") base.buildVectors = [...(base.buildVectors ?? []), "tank", "solo"];
  if (nextSignal === "faster") base.statPhilosophy = ["agility_forward", ...(base.statPhilosophy ?? [])];
  if (nextSignal === "different") base.raceMode = "surprise";
  if (nextSignal === "no_pet") base.buildVectors = [...(base.buildVectors ?? []), "melee"];
  return base;
}

export function DeathJourneyStep() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [lastRecommendErr, setLastRecommendErr] = useState<unknown>(null);
  const [chipNonce, setChipNonce] = useState(0);
  const [experimentalOffer, setExperimentalOffer] = useState<"none" | "cohort" | "forced">("none");
  const [recommendLane, setRecommendLane] = useState<"curated" | "experimental" | null>(null);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem(SessionKeys.death.sessionId)) {
        sessionStorage.setItem(SessionKeys.death.sessionId, crypto.randomUUID());
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const sid = sessionStorage.getItem(SessionKeys.death.sessionId) ?? "";
    if (!sid) return;
    void fetchAnalyticsConfig()
      .then((cfg) => {
        if (cancelled) return;
        const pct = cfg.experimentalLane?.offerPercent ?? 0;
        if (experimentalCohortHit(sid, pct)) {
          setExperimentalOffer("cohort");
          setRecommendLane("curated");
          trackEvent(AnalyticsEvent.ExperimentalLaneOfferShown, { flow: "release_spirit", offerPercent: pct });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function onGenerate(signals: BuildIntentSignals) {
    const sessionId = sessionStorage.getItem(SessionKeys.death.sessionId) ?? crypto.randomUUID();
    sessionStorage.setItem(SessionKeys.death.sessionId, sessionId);
    const mood = sessionStorage.getItem(SessionKeys.death.mood) ?? undefined;
    const nextSignal = sessionStorage.getItem(SessionKeys.death.nextSignal) ?? undefined;
    const detailFreeform = buildDeathContextFreeform();
    const promptBias = deriveSignalBias(mood, nextSignal);

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
        entryPath: "release_spirit",
      }).catch((err) => {
        debugClientIgnored("death_journey.growth_assignment", err);
        return null;
      });

      const laneArg = recommendLane === "experimental" ? { recommendLane: "experimental" as const } : {};

      const mergedSignals = {
        mood: augmentMoodWithPower(mood, SessionKeys.death.buildIntent),
        nextSignal,
        freeform: detailFreeform,
        memoryHints: buildMemoryHints(),
        recommendVariantId: assignment?.variantId ?? undefined,
        ...promptBias,
        ...signals,
        ...laneArg,
      };
      const result = await fetchDestiny({
        entryPath: "release_spirit",
        sessionId,
        signals: mergedSignals,
      });
      writeStoredDestiny("death", {
        sessionId: result.sessionId,
        destinyId: result.destinyId,
        output: result.output,
        intentSnapshot: { ...promptBias, ...signals },
        experimentalLane: result.experimentalLane,
        experimentalCandidate: result.experimentalCandidate,
      });
      if (result.filterRelaxedForAi) {
        try {
          sessionStorage.setItem(SessionKeys.death.recommendRelaxBanner, "1");
        } catch {
          /* ignore */
        }
      }
      sessionStorage.setItem(SessionKeys.death.destinyId, result.destinyId);
      setLastRecommendErr(null);
      if (assignment) {
        void submitGrowthOutcome({
          assignmentId: assignment.assignmentId,
          converted: true,
          outcome: { event: "recommend_rendered", destinyId: result.destinyId },
        }).catch((err) => {
          debugClientIgnored("death_journey.growth_outcome", err);
        });
      }
      navigate("/release-spirit/result");
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
            if (softenBuildIntentOneSlot(SessionKeys.death.buildIntent)) {
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
          <Link to="/release-spirit/next">Death setup</Link>
        </span>
        <span className="flow-crumb">/</span>
        <span className="flow-crumb">Filters and generate</span>
      </div>
      <p className="step-label" style={{ marginBottom: 8 }}>
        Release spirit · step 2 of 2
      </p>
      <BuildIntentChips
        key={chipNonce}
        storageKey={SessionKeys.death.buildIntent}
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
