import type { ApiEnv } from "../db/client";

export type ShareStatus = "queued" | "rendering" | "ready" | "failed";

export type SharePayload = {
  destiny: {
    headline: string;
    subline: string;
    classId: string;
    tierProse: string;
    bullets: string[];
  };
  memorial?: {
    epitaph: string;
    characterName: string;
    level: number | null;
    location: string;
    cause: string;
    faction: "horde" | "alliance" | "neutral";
  };
};

function escape(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function wrapLines(input: string, maxChars: number): string[] {
  const words = input.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function renderShareSvg(payload: SharePayload): string {
  const headlineLines = wrapLines(payload.destiny.headline, 36).slice(0, 2);
  const sublineLines = wrapLines(payload.destiny.subline, 54).slice(0, 2);
  const tierLines = wrapLines(payload.destiny.tierProse, 72).slice(0, 2);
  const destinyBullets = payload.destiny.bullets
    .slice(0, 4)
    .map((b, i) => `<tspan x="56" dy="${i === 0 ? 0 : 34}">• ${escape(b)}</tspan>`)
    .join("");

  const memorialBlock = payload.memorial
    ? `
      <rect x="40" y="40" width="1200" height="220" rx="20" fill="#161a25" />
      <text x="56" y="86" font-size="24" fill="#c7b58a" font-family="Inter, system-ui, sans-serif">In Memory</text>
      <text x="56" y="126" font-size="36" fill="#f8f2de" font-weight="700" font-family="Inter, system-ui, sans-serif">
        ${escape(payload.memorial.characterName)}
      </text>
      <text x="56" y="162" font-size="22" fill="#b3b8c7" font-family="Inter, system-ui, sans-serif">
        ${escape(payload.memorial.location)} · ${escape(payload.memorial.cause)}
      </text>
      <text x="56" y="196" font-size="20" fill="#d5d8e1" font-family="Inter, system-ui, sans-serif">
        "${escape(payload.memorial.epitaph)}"
      </text>
    `
    : "";

  const destinyStartY = payload.memorial ? 300 : 80;
  const headlineY = destinyStartY + 92;
  const sublineY = headlineY + headlineLines.length * 46 + 8;
  const tierY = sublineY + sublineLines.length * 30 + 10;
  const bulletsY = tierY + tierLines.length * 30 + 24;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f1117" />
      <stop offset="100%" stop-color="#151b2f" />
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)" />
  ${memorialBlock}
  <rect x="40" y="${destinyStartY}" width="1200" height="${payload.memorial ? 380 : 600}" rx="20" fill="#1c2233" />
  <text x="56" y="${destinyStartY + 48}" font-size="24" fill="#93a0c8" font-family="Inter, system-ui, sans-serif">Next Destiny</text>
  <text x="56" y="${headlineY}" font-size="44" fill="#f3f5fb" font-weight="700" font-family="Inter, system-ui, sans-serif">
    ${headlineLines.map((line, i) => `<tspan x="56" dy="${i === 0 ? 0 : 46}">${escape(line)}</tspan>`).join("")}
  </text>
  <text x="56" y="${sublineY}" font-size="22" fill="#cfd6ea" font-family="Inter, system-ui, sans-serif">
    ${sublineLines.map((line, i) => `<tspan x="56" dy="${i === 0 ? 0 : 30}">${escape(line)}</tspan>`).join("")}
  </text>
  <text x="56" y="${tierY}" font-size="20" fill="#a9b2cc" font-family="Inter, system-ui, sans-serif">
    ${tierLines.map((line, i) => `<tspan x="56" dy="${i === 0 ? 0 : 30}">${escape(line)}</tspan>`).join("")}
  </text>
  <text x="56" y="${bulletsY}" font-size="26" fill="#e7ecfb" font-family="Inter, system-ui, sans-serif">
    ${destinyBullets}
  </text>
  <text x="40" y="696" font-size="16" fill="#818aa5" font-family="Inter, system-ui, sans-serif">wegoagane.com</text>
</svg>`;
}

export function fallbackShareSvg(runId: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#11161f" />
  <text x="60" y="140" font-size="42" fill="#f1f5ff" font-family="Inter, system-ui, sans-serif">Preparing share image…</text>
  <text x="60" y="190" font-size="24" fill="#9aa5c3" font-family="Inter, system-ui, sans-serif">Run ${escape(runId)}</text>
</svg>`;
}

export function shareImageUrl(env: ApiEnv["Bindings"], runId: string): string {
  const base = env.SHARE_IMAGE_BASE_URL?.trim() || `${env.SITE_ORIGIN ?? "https://wegoagane.com"}/api/v1/share`;
  return `${base}/${runId}/image`;
}
