import type { SVGProps } from "react";

/** Suggests dual-panel share artifact (handbook §15.1 combo). */
export function ShareFrameIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} role="img" aria-hidden {...props}>
      <rect x="3" y="5" width="7" height="14" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="14" y="5" width="7" height="14" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 12 h2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}
