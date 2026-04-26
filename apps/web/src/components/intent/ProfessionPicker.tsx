import { useMemo } from "react";
import { IdentityPortrait } from "../IdentityPortrait";
import { professionOptionsFor, type ProfessionId, type ProfessionOption } from "./intentOptions";

type Props = {
  primary: ProfessionId | null;
  secondary: ProfessionId | null;
  soloSelfFound?: boolean;
  onChange: (next: { primary: ProfessionId | null; secondary: ProfessionId | null }) => void;
  /** When false, show only the primary slot (Balanced primary pillar uses this for two clicks). */
  showSecondary?: boolean;
  className?: string;
};

/**
 * Two-slot profession picker (icon grid).
 * Tap a card in the primary row to set primary. Then tap a card in the secondary row to set
 * secondary; the secondary list excludes the picked primary. Fishing, Cooking, and First Aid
 * are intentionally absent — they're assumed always available.
 */
export function ProfessionPicker({
  primary,
  secondary,
  soloSelfFound = false,
  onChange,
  showSecondary = true,
  className,
}: Props) {
  const all = useMemo(() => professionOptionsFor(soloSelfFound), [soloSelfFound]);
  const secondaryPool = useMemo(
    () => all.filter((o) => o.id !== primary),
    [all, primary],
  );

  function setPrimary(id: ProfessionId) {
    if (id === primary) {
      onChange({ primary: null, secondary });
      return;
    }
    onChange({ primary: id, secondary: secondary === id ? null : secondary });
  }

  function setSecondary(id: ProfessionId) {
    onChange({ primary, secondary: id === secondary ? null : id });
  }

  return (
    <div className={`profession-picker ${className ?? ""}`.trim()}>
      <p className="step-label" style={{ marginBottom: 6 }}>
        Pick your primary profession
      </p>
      <ProfessionGrid
        options={all}
        activeId={primary}
        ariaLabel="Primary profession"
        onPick={setPrimary}
      />
      {showSecondary ? (
        <>
          <p className="step-label" style={{ marginTop: 12, marginBottom: 6 }}>
            {primary ? "Pick your secondary profession" : "Pick primary first to choose a secondary"}
          </p>
          <ProfessionGrid
            options={secondaryPool}
            activeId={secondary}
            ariaLabel="Secondary profession"
            onPick={setSecondary}
            disabled={!primary}
          />
        </>
      ) : null}
      <p className="ui-caption ui-caption--xs" style={{ marginTop: 8 }}>
        Fishing, Cooking, and First Aid are assumed available — pick the two anchor crafts only.
      </p>
    </div>
  );
}

function ProfessionGrid({
  options,
  activeId,
  ariaLabel,
  onPick,
  disabled,
}: {
  options: ProfessionOption[];
  activeId: ProfessionId | null;
  ariaLabel: string;
  onPick: (id: ProfessionId) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="profession-picker__grid"
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
    >
      {options.map((opt) => {
        const active = activeId === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            className={`profession-picker__tile ${active ? "profession-picker__tile--on" : ""}`}
            onClick={() => onPick(opt.id)}
          >
            <IdentityPortrait
              src={opt.iconUrl}
              alt=""
              className="profession-picker__icon"
              title={opt.label}
            />
            <span className="profession-picker__label">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
