import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BuildIntentChips } from "../../components/BuildIntentChips";
import { IdentityPortrait } from "../../components/IdentityPortrait";
import { wowPackUrl } from "../../content/identityAssets";
import type { BuildIntentSignals } from "../../lib/buildIntentTypes";
import { softenBuildIntentOneSlot } from "../../lib/buildIntentRecover";
import { augmentNextSignalWithPower } from "../../lib/journeySignalsExtras";
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

export function LuckyJourneyStep() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [lastRecommendErr, setLastRecommendErr] = useState<unknown>(null);
  const [chipNonce, setChipNonce] = useState(0);

  useEffect(() => {
    sessionStorage.removeItem(SessionKeys.lucky.generatedDestiny);
    sessionStorage.removeItem(SessionKeys.lucky.destinyId);
  }, []);

  async function onGenerate(signals: BuildIntentSignals) {
    const sessionId = sessionStorage.getItem(SessionKeys.lucky.sessionId) ?? crypto.randomUUID();
    sessionStorage.setItem(SessionKeys.lucky.sessionId, sessionId);

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

      const result = await fetchDestiny({
        entryPath: "lucky_roll",
        sessionId,
        signals: {
          nextSignal: augmentNextSignalWithPower("Surprise me", SessionKeys.lucky.buildIntent),
          memoryHints: buildMemoryHints(),
          recommendVariantId: assignment?.variantId ?? undefined,
          ...signals,
        },
      });
      writeStoredDestiny("lucky", {
        sessionId: result.sessionId,
        destinyId: result.destinyId,
        output: result.output,
        intentSnapshot: signals,
      });
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
    } finally {
      setIsGenerating(false);
    }
  }

  const filterRecoveryAction =
    lastRecommendErr && recommendErrorSuggestsSoftenFilters(lastRecommendErr)
      ? {
          label: "Soften one filter",
          onSoften: () => {
            if (softenBuildIntentOneSlot(SessionKeys.lucky.buildIntent)) {
              setChipNonce((n) => n + 1);
              setError("");
              setLastRecommendErr(null);
            }
          },
        }
      : null;

  return (
    <div>
      <div className="card" style={{ marginBottom: 12 }}>
        <p className="step-label">Lucky roll</p>
        <h1 className="hero-question">Set your lucky roll profile</h1>
        <p className="hero-sub" style={{ marginBottom: 0 }}>
          Fastest route: pick a priority and generate a commit-ready run in a few taps.
        </p>
        <div className="entry-icon-row entry-icon-row--overlap" style={{ marginTop: 10 }}>
          <IdentityPortrait src={wowPackUrl("Miscellaneous", "Dice_02.png")} alt="" className="entry-icon" />
          <IdentityPortrait src={wowPackUrl("Spells", "StarFire.png")} alt="" className="entry-icon" />
          <IdentityPortrait src={wowPackUrl("Abilities", "BloodFrenzy.png")} alt="" className="entry-icon" />
        </div>
      </div>
      <BuildIntentChips
        key={chipNonce}
        storageKey={SessionKeys.lucky.buildIntent}
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
