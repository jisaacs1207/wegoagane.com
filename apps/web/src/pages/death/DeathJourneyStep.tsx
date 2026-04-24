import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BuildIntentChips } from "../../components/BuildIntentChips";
import type { BuildIntentSignals } from "../../lib/buildIntentTypes";
import { fetchDestiny, fetchGrowthAssignment, submitGrowthOutcome } from "../../lib/recommendClient";
import { buildMemoryHints } from "../../lib/memoryProfile";
import { writeStoredDestiny } from "../../lib/flowDestinyState";

export function DeathJourneyStep() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  async function onGenerate(signals: BuildIntentSignals) {
    const sessionId = sessionStorage.getItem("death.sessionId") ?? crypto.randomUUID();
    sessionStorage.setItem("death.sessionId", sessionId);
    const mood = sessionStorage.getItem("death.mood") ?? undefined;
    const nextSignal = sessionStorage.getItem("death.nextSignal") ?? undefined;

    setIsGenerating(true);
    setError("");
    try {
      const assignment = await fetchGrowthAssignment({
        sessionId,
        surface: "recommendation",
        entryPath: "release_spirit",
      }).catch(() => null);

      const result = await fetchDestiny({
        entryPath: "release_spirit",
        sessionId,
        signals: {
          mood,
          nextSignal,
          memoryHints: buildMemoryHints(),
          recommendVariantId: assignment?.variantId ?? undefined,
          ...signals,
        },
      });
      writeStoredDestiny("death", {
        sessionId: result.sessionId,
        destinyId: result.destinyId,
        output: result.output,
      });
      sessionStorage.setItem("death.destinyId", result.destinyId);
      if (assignment) {
        void submitGrowthOutcome({
          assignmentId: assignment.assignmentId,
          converted: true,
          outcome: { event: "recommend_rendered", destinyId: result.destinyId },
        }).catch(() => {});
      }
      navigate("/release-spirit/result");
    } catch {
      setError("Generation failed. Adjust your path or try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div>
      <BuildIntentChips
        storageKey="death.buildIntent"
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

