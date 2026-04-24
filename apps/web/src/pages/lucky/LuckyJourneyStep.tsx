import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BuildIntentChips } from "../../components/BuildIntentChips";
import type { BuildIntentSignals } from "../../lib/buildIntentTypes";
import { fetchDestiny, fetchGrowthAssignment, submitGrowthOutcome } from "../../lib/recommendClient";
import { buildMemoryHints } from "../../lib/memoryProfile";
import { writeStoredDestiny } from "../../lib/flowDestinyState";

export function LuckyJourneyStep() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

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
          nextSignal: "Surprise me",
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
    } catch {
      setError("Generation failed. Adjust your path or try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 12 }}>
        <p className="step-label">Lucky roll</p>
        <h1 className="hero-question">Choose your luck profile</h1>
        <p className="hero-sub" style={{ marginBottom: 0 }}>
          Build your path, then generate on the final step.
        </p>
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

