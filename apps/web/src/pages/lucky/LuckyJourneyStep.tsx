import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BuildIntentChips } from "../../components/BuildIntentChips";
import { IdentityPortrait } from "../../components/IdentityPortrait";
import { wowPackUrl } from "../../content/identityAssets";
import type { BuildIntentSignals } from "../../lib/buildIntentTypes";
import { augmentNextSignalWithPower } from "../../lib/journeySignalsExtras";
import { fetchDestiny, fetchGrowthAssignment, submitGrowthOutcome } from "../../lib/recommendClient";
import { buildMemoryHints } from "../../lib/memoryProfile";
import { writeStoredDestiny } from "../../lib/flowDestinyState";

export function LuckyJourneyStep() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    sessionStorage.removeItem("lucky.generatedDestiny");
    sessionStorage.removeItem("lucky.destinyId");
  }, []);

  async function onGenerate(signals: BuildIntentSignals) {
    const sessionId = sessionStorage.getItem("lucky.sessionId") ?? crypto.randomUUID();
    sessionStorage.setItem("lucky.sessionId", sessionId);

    setIsGenerating(true);
    setError("");
    try {
      const assignment = await fetchGrowthAssignment({
        sessionId,
        surface: "recommendation",
        entryPath: "lucky_roll",
      }).catch(() => null);

      const result = await fetchDestiny({
        entryPath: "lucky_roll",
        sessionId,
        signals: {
          nextSignal: augmentNextSignalWithPower("Surprise me", "lucky.buildIntent"),
          memoryHints: buildMemoryHints(),
          recommendVariantId: assignment?.variantId ?? undefined,
          ...signals,
        },
      });
      writeStoredDestiny("lucky", {
        sessionId: result.sessionId,
        destinyId: result.destinyId,
        output: result.output,
      });
      sessionStorage.setItem("lucky.destinyId", result.destinyId);
      if (assignment) {
        void submitGrowthOutcome({
          assignmentId: assignment.assignmentId,
          converted: true,
          outcome: { event: "recommend_rendered", destinyId: result.destinyId },
        }).catch(() => {});
      }
      navigate("/lucky-roll/result");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("recommend_failed:400")) {
        setError("Generation failed due to invalid input. Reset path choices and try again.");
      } else {
        setError("Generation failed. Adjust your path or try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  }

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
        storageKey="lucky.buildIntent"
        isGenerating={isGenerating}
        hasGenerated={false}
        onGenerate={(signals) => void onGenerate(signals)}
      />
      {error ? (
        <p className="hero-sub" style={{ marginTop: 10 }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

