import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  destinyFixture,
  memorialFixture,
  type DestinyFixture,
  type MemorialFixture,
} from "../../content/cardFixtures";
import { DestinyCard } from "../../components/cards/DestinyCard";
import { MemorialCard } from "../../components/cards/MemorialCard";
import { fetchDestiny, fetchMemorial } from "../../lib/recommendClient";

export function DeathResultStep() {
  const [destiny, setDestiny] = useState<DestinyFixture>(destinyFixture);
  const [memorial, setMemorial] = useState<MemorialFixture>(memorialFixture);

  useEffect(() => {
    const mood = sessionStorage.getItem("death.mood") ?? undefined;
    const nextSignal = sessionStorage.getItem("death.nextSignal") ?? undefined;
    const existingSession = sessionStorage.getItem("death.sessionId");
    const sessionId = existingSession ?? crypto.randomUUID();
    if (!existingSession) {
      sessionStorage.setItem("death.sessionId", sessionId);
    }

    void fetchDestiny({
      entryPath: "release_spirit",
      sessionId,
      signals: { mood, nextSignal },
    })
      .then(setDestiny)
      .catch(() => setDestiny(destinyFixture));

    void fetchMemorial({
      sessionId,
      zone: "Unknown Zone",
      cause: "Unknown Cause",
      mood,
      nextSignal,
      faction: "horde",
      characterName: memorialFixture.characterName,
      level: memorialFixture.level ?? undefined,
    })
      .then(setMemorial)
      .catch(() => setMemorial(memorialFixture));
  }, []);

  return (
    <div>
      <MemorialCard data={memorial} />
      <div style={{ marginTop: 14 }}>
        <DestinyCard data={destiny} />
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ts)", lineHeight: 1.45 }}>
          Memorial and next destiny can export as one image for sharing. See a{" "}
          <strong>narrow side-by-side layout</strong> on{" "}
          <Link to="/design/cards">card shells</Link> — polish, imagery, and real copy ship in later milestones.
        </p>
        <div className="flow-nav" style={{ marginTop: 18 }}>
          <Link to="/" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center" }}>
            Home
          </Link>
          <button type="button" className="btn-primary" disabled title="Rating gate + share in a later milestone">
            Accept this fate (soon)
          </button>
        </div>
      </div>
    </div>
  );
}
