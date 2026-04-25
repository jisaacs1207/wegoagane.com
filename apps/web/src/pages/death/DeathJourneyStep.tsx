import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BuildIntentChips } from "../../components/BuildIntentChips";
import type { BuildIntentSignals } from "../../lib/buildIntentTypes";
import { softenBuildIntentOneSlot } from "../../lib/buildIntentRecover";
import { augmentMoodWithPower } from "../../lib/journeySignalsExtras";
import {
  destinyRecommendErrorHint,
  fetchDestiny,
  fetchGrowthAssignment,
  recommendErrorSuggestsSoftenFilters,
  submitGrowthOutcome,
} from "../../lib/recommendClient";
import { debugClientIgnored } from "../../lib/clientDebug";
import { SessionKeys } from "../../lib/sessionKeys";
import { buildMemoryHints } from "../../lib/memoryProfile";
import { writeStoredDestiny } from "../../lib/flowDestinyState";

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
  if (mood === "Bullshit death" || mood === "First time") base.statPhilosophy = ["stamina_forward", "balanced"];
  if (mood === "Long time coming") base.buildVectors = ["hybrid", "group_ok"];
  if (nextSignal === "Safer") base.buildVectors = [...(base.buildVectors ?? []), "tank", "solo"];
  if (nextSignal === "Faster") base.statPhilosophy = ["agility_forward", ...(base.statPhilosophy ?? [])];
  if (nextSignal === "Different" || nextSignal === "Different playstyle") base.raceMode = "surprise";
  if (nextSignal === "No pet class" || nextSignal === "No pet classes") base.buildVectors = [...(base.buildVectors ?? []), "melee"];
  return base;
}

export function DeathJourneyStep() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [lastRecommendErr, setLastRecommendErr] = useState<unknown>(null);
  const [chipNonce, setChipNonce] = useState(0);

  async function onGenerate(signals: BuildIntentSignals) {
    const sessionId = sessionStorage.getItem(SessionKeys.death.sessionId) ?? crypto.randomUUID();
    sessionStorage.setItem(SessionKeys.death.sessionId, sessionId);
    const mood = sessionStorage.getItem(SessionKeys.death.mood) ?? undefined;
    const nextSignal = sessionStorage.getItem(SessionKeys.death.nextSignal) ?? undefined;
    const detailFreeform = buildDeathContextFreeform();
    const promptBias = deriveSignalBias(mood, nextSignal);

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

      const mergedSignals = {
        mood: augmentMoodWithPower(mood, SessionKeys.death.buildIntent),
        nextSignal,
        freeform: detailFreeform,
        memoryHints: buildMemoryHints(),
        recommendVariantId: assignment?.variantId ?? undefined,
        ...promptBias,
        ...signals,
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
      });
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
            }
          },
        }
      : null;

  return (
    <div>
      <p className="step-label" style={{ marginBottom: 8 }}>
        Release spirit · step 4 of 4
      </p>
      <BuildIntentChips
        key={chipNonce}
        storageKey={SessionKeys.death.buildIntent}
        isGenerating={isGenerating}
        hasGenerated={false}
        filterRecoveryAction={filterRecoveryAction}
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
