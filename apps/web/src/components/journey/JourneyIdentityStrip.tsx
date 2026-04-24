import { useMemo } from "react";
import type { BuildIntentSignals } from "../../lib/buildIntentTypes";
import {
  CORE_PRESET_VISUAL_URLS,
  DEPTH_VISUAL_URLS,
  ITEM_SLOT_URL,
  VECTOR_JOURNEY_URLS,
  type JourneyVectorKey,
} from "../../content/identityAssets";
import { collectJourneyPickChips, PICK_CATEGORY_URL, type PickCategory } from "../../content/journeyPickAssets";
import { IdentityPortrait } from "../IdentityPortrait";
import type { CorePreset, IntentDepth } from "../intent/intentOptions";

type JourneyStep = "depth" | "vector" | "question" | "review";

type Props = {
  step: JourneyStep;
  vector: JourneyVectorKey;
  depth: IntentDepth;
  corePreset: CorePreset;
  signals: BuildIntentSignals;
};

const MAX_PICK_CHIPS = 14;

export function JourneyIdentityStrip({ step, vector, depth, corePreset, signals }: Props) {
  const vectorSrc = VECTOR_JOURNEY_URLS[vector];
  const depthSrc = DEPTH_VISUAL_URLS[depth];
  const presetSrc = CORE_PRESET_VISUAL_URLS[corePreset];
  const stepLabel =
    step === "depth" ? "Depth" : step === "vector" ? "Vector" : step === "question" ? "Refine" : "Forge";

  const pickChips = useMemo(() => collectJourneyPickChips(signals), [signals]);
  const visiblePicks = pickChips.slice(0, MAX_PICK_CHIPS);
  const overflow = pickChips.length - visiblePicks.length;

  return (
    <div className={`journey-identity-strip journey-identity-strip--${step}`} aria-hidden="true">
      <div className="journey-identity-strip__glow" />
      <div className="journey-identity-strip__primary">
        <IdentityPortrait src={depthSrc} alt="Journey depth" className="journey-identity-strip__icon" title={`Depth: ${depth}`} />
        <IdentityPortrait
          src={presetSrc}
          alt="Core route"
          className="journey-identity-strip__icon"
          title={`Core: ${corePreset}`}
        />
        <IdentityPortrait
          src={vectorSrc}
          alt="Entrance vector"
          className="journey-identity-strip__icon journey-identity-strip__icon--accent"
          title="Entrance vector"
        />
        <IdentityPortrait src={ITEM_SLOT_URL} alt="Item milestones" className="journey-identity-strip__icon" title="Milestones" />
      </div>
      {visiblePicks.length > 0 ? (
        <div className="journey-identity-strip__picks" title={stepLabel}>
          {visiblePicks.map((chip) => (
            <span key={chip.id} className={`journey-pick journey-pick--${chip.category as PickCategory}`}>
              <IdentityPortrait
                src={PICK_CATEGORY_URL[chip.category]}
                alt=""
                className="journey-pick__icon"
                title={chip.label}
              />
              <span className="journey-pick__label">{chip.label}</span>
            </span>
          ))}
          {overflow > 0 ? <span className="journey-pick journey-pick--overflow">+{overflow}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
