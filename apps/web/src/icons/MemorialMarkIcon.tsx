import type { SVGProps } from "react";

/** Abstract plinth / mark — not a franchise symbol. */
export function MemorialMarkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} role="img" aria-hidden {...props}>
      <path
        d="M7 20 L7 10 L10 7 L14 7 L17 10 L17 20 Z M9 20 h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
