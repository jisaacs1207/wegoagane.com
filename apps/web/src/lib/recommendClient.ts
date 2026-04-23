import type { ClassId } from "../icons/types";
import type { DestinyFixture, MemorialFixture } from "../content/cardFixtures";

type EntryPath = "release_spirit" | "draft_a_run" | "lucky_roll";

type RecommendRequest = {
  sessionId?: string;
  entryPath: EntryPath;
  signals: {
    mood?: string;
    nextSignal?: string;
    intent?: string;
    freeform?: string;
    excludedClasses?: ClassId[];
  };
};

type RecommendResponse = {
  output: {
    headline: string;
    subline: string;
    classId: ClassId;
    tierProse: string;
    bullets: string[];
  };
};

type MemorialRequest = {
  sessionId?: string;
  zone: string;
  cause: string;
  mood?: string;
  nextSignal?: string;
  faction?: "horde" | "alliance";
  characterName?: string;
  level?: number;
};

type MemorialResponse = {
  output: {
    epitaph: string;
    characterName: string;
    level: number | null;
    location: string;
    cause: string;
    faction: "horde" | "alliance" | "neutral";
  };
};

export async function fetchDestiny(input: RecommendRequest): Promise<DestinyFixture> {
  const response = await fetch("/api/v1/recommend", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`recommend_failed:${response.status}`);
  }

  const data = (await response.json()) as RecommendResponse;
  return {
    headline: data.output.headline,
    subline: data.output.subline,
    classId: data.output.classId,
    tierProse: data.output.tierProse,
    bullets: data.output.bullets,
  };
}

export async function fetchMemorial(input: MemorialRequest): Promise<MemorialFixture> {
  const response = await fetch("/api/v1/memorial", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`memorial_failed:${response.status}`);
  }

  const data = (await response.json()) as MemorialResponse;
  return {
    epitaph: data.output.epitaph,
    characterName: data.output.characterName,
    level: data.output.level,
    location: data.output.location,
    cause: data.output.cause,
    faction: data.output.faction,
  };
}
