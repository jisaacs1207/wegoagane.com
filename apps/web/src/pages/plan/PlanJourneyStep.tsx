import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BuildIntentChips } from "../../components/BuildIntentChips";
import type { BuildIntentSignals } from "../../lib/buildIntentTypes";
import { fetchDestiny, fetchGrowthAssignment, submitGrowthOutcome } from "../../lib/recommendClient";
import { buildMemoryHints } from "../../lib/memoryProfile";
import { writeStoredDestiny } from "../../lib/flowDestinyState";

export function PlanJourneyStep() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  async function onGenerate(signals: BuildIntentSignals) {
    const sessionId = sessionStorage.getItem("plan.sessionId") ?? crypto.randomUUID();
    sessionStorage.setItem("plan.sessionId", sessionId);
    const intent = sessionStorage.getItem("plan.intent") ?? undefined;
    const freeform = sessionStorage.getItem("plan.freeform") ?? undefined;

    setIsGenerating(true);
    setError("");
    try {
      const assignment = await fetchGrowthAssignment({
        sessionId,
        surface: "recommendation",
        entryPath: "draft_a_run",
      }).catch(() => null);

      const result = await fetchDestiny({
        entryPath: "draft_a_run",
        sessionId,
        signals: {
          intent,
          freeform,
          memoryHints: buildMemoryHints(),
          recommendVariantId: assignment?.variantId ?? undefined,
          ...signals,
        },
      });
      writeStoredDestiny("plan", {
        sessionId: result.sessionId,
        destinyId: result.destinyId,
        output: result.output,
      });
      sessionStorage.setItem("plan.destinyId", result.destinyId);
      if (assignment) {
        void submitGrowthOutcome({
          assignmentId: assignment.assignmentId,
          converted: true,
          outcome: { event: "recommend_rendered", destinyId: result.destinyId },
        }).catch(() => {});
      }
      navigate("/draft-a-run/result");
    } catch {
      setError("Generation failed. Adjust your path or try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div>
      <BuildIntentChips
        storageKey="plan.buildIntent"
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

