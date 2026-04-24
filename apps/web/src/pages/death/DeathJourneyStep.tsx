import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BuildIntentChips } from "../../components/BuildIntentChips";
import type { BuildIntentSignals } from "../../lib/buildIntentTypes";
import { augmentMoodWithPower } from "../../lib/journeySignalsExtras";
import { fetchDestiny, fetchGrowthAssignment, submitGrowthOutcome } from "../../lib/recommendClient";
import { buildMemoryHints } from "../../lib/memoryProfile";
import { writeStoredDestiny } from "../../lib/flowDestinyState";

function buildDeathContextFreeform() {
  const zone = sessionStorage.getItem("death.detail.zone")?.trim();
  const cause = sessionStorage.getItem("death.detail.cause")?.trim();
  const level = sessionStorage.getItem("death.detail.level")?.trim();
  const note = sessionStorage.getItem("death.detail.note")?.trim();
  const bits = [zone ? `Zone: ${zone}` : "", cause ? `Cause: ${cause}` : "", level ? `Level: ${level}` : "", note ? `Note: ${note}` : ""].filter(Boolean);
  return bits.length ? bits.join(" | ") : undefined;
}

function deriveSignalBias(mood?: string, nextSignal?: string): BuildIntentSignals {
  const base: BuildIntentSignals = {};
  if (mood === "Bullshit death" || mood === "First time") base.statPhilosophy = ["stamina_forward", "balanced"];
  if (mood === "Long time coming") base.buildVectors = ["hybrid", "group_ok"];
  if (nextSignal === "Safer") base.buildVectors = [...(base.buildVectors ?? []), "tank", "solo"];
  if (nextSignal === "Faster") base.statPhilosophy = ["agility_forward", ...(base.statPhilosophy ?? [])];
  if (nextSignal === "Different") base.raceMode = "surprise";
  if (nextSignal === "No pet class") base.buildVectors = [...(base.buildVectors ?? []), "melee"];
  return base;
}

export function DeathJourneyStep() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  async function onGenerate(signals: BuildIntentSignals) {
    const sessionId = sessionStorage.getItem("death.sessionId") ?? crypto.randomUUID();
    sessionStorage.setItem("death.sessionId", sessionId);
    const mood = sessionStorage.getItem("death.mood") ?? undefined;
    const nextSignal = sessionStorage.getItem("death.nextSignal") ?? undefined;
    const detailFreeform = buildDeathContextFreeform();
    const promptBias = deriveSignalBias(mood, nextSignal);

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
          mood: augmentMoodWithPower(mood, "death.buildIntent"),
          nextSignal,
          freeform: detailFreeform,
          memoryHints: buildMemoryHints(),
          recommendVariantId: assignment?.variantId ?? undefined,
          ...promptBias,
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

