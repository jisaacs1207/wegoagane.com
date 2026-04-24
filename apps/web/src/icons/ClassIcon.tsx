import type { SVGProps } from "react";
import type { ClassId } from "./types";

const VAR: Record<ClassId, string> = {
  mage: "var(--mage)",
  hunter: "var(--hunter)",
  warrior: "var(--warrior)",
  warlock: "var(--warlock)",
  priest: "var(--priest)",
  rogue: "var(--rogue)",
  druid: "var(--druid)",
  paladin: "var(--paladin)",
  shaman: "var(--shaman)",
};

type IconProps = { classId: ClassId; accessibleName?: string } & Omit<SVGProps<SVGSVGElement>, "children">;

/**
 * Class-colored vector glyphs (WoW palette via CSS vars — not Blizzard artwork).
 * Prefer these over unrelated abstract marks anywhere class identity should read.
 */
export function ClassIcon({ classId, accessibleName, ...rest }: IconProps) {
  const stroke = VAR[classId];
  const label = accessibleName ?? `${classId} (icon)`;

  const glyph = (() => {
    switch (classId) {
      case "warrior":
        return (
          <path
            d="M12 3 L19 8 L19 16 L12 21 L5 16 L5 8 Z M12 8 v9 M8 11 h8"
            fill="none"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      case "mage":
        return (
          <>
            <path d="M12 4 L17 20 L7 20 Z" fill="none" strokeWidth="1.75" strokeLinejoin="round" />
            <circle cx="12" cy="9" r="2.25" fill={stroke} />
          </>
        );
      case "rogue":
        return (
          <>
            <path d="M6 8 L18 8" strokeWidth="1.75" strokeLinecap="round" />
            <path d="M7 13 L17 13" strokeWidth="1.75" strokeLinecap="round" />
            <path d="M8 18 L16 18" strokeWidth="1.75" strokeLinecap="round" />
          </>
        );
      case "priest":
        return (
          <>
            <circle cx="12" cy="12" r="8" strokeWidth="1.75" />
            <path d="M12 8 v8 M8 12 h8" strokeWidth="1.75" strokeLinecap="round" />
          </>
        );
      case "hunter":
        return (
          <path
            d="M6 18 L12 6 L18 18 M9 14 h6"
            fill="none"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      case "warlock":
        return (
          <path
            d="M12 4 L18 10 L15 20 L9 20 L6 10 Z"
            fill="none"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        );
      case "druid":
        return (
          <path
            d="M17 5 C9 5 4 12 6 19 M17 5 c3 6 1 14-5 17"
            fill="none"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        );
      case "paladin":
        return (
          <path
            d="M12 4 L12 20 M6 9 Q12 5 18 9 L18 16 Q12 20 6 16 Z"
            fill="none"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        );
      case "shaman":
        return (
          <path
            d="M8 5 L10 19 M12 3 L12 21 M14 5 L16 19"
            fill="none"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        );
      default:
        return null;
    }
  })();

  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      role="img"
      aria-label={label}
      {...rest}
    >
      <title>{label}</title>
      <g stroke={stroke} fill="none">
        {glyph}
      </g>
    </svg>
  );
}
