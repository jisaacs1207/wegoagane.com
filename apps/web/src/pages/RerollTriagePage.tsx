import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchDestiny, flowApiErrorHint, submitDestinyFeedback, type RecommendRequest } from "../lib/recommendClient";
import { readStoredDestiny, writeStoredDestiny } from "../lib/flowDestinyState";
import { readBuildIntent } from "../lib/readBuildIntent";
import { SessionKeys } from "../lib/sessionKeys";
import { buildMemoryHints } from "../lib/memoryProfile";

type Flow = "plan" | "death" | "lucky";

function flowMeta(flow: Flow) {
  if (flow === "plan") {
    return {
      entryPath: "draft_a_run" as const,
      storageKey: SessionKeys.plan.buildIntent,
      restartPath: "/draft-a-run/intent",
      resultPath: "/draft-a-run/result",
      sessionKey: SessionKeys.plan.sessionId,
      destinyKey: SessionKeys.plan.destinyId,
    };
  }
  if (flow === "death") {
    return {
      entryPath: "release_spirit" as const,
      storageKey: SessionKeys.death.buildIntent,
      restartPath: "/release-spirit/mood",
      resultPath: "/release-spirit/result",
      sessionKey: SessionKeys.death.sessionId,
      destinyKey: SessionKeys.death.destinyId,
    };
  }
  return {
    entryPath: "lucky_roll" as const,
    storageKey: SessionKeys.lucky.buildIntent,
    restartPath: "/lucky-roll/journey",
    resultPath: "/lucky-roll/result",
    sessionKey: SessionKeys.lucky.sessionId,
    destinyKey: SessionKeys.lucky.destinyId,
  };
}

export function RerollTriagePage() {
  const navigate = useNavigate();
  const params = useParams<{ flow: Flow }>();
  const flow = (params.flow === "plan" || params.flow === "death" || params.flow === "lucky" ? params.flow : "plan") as Flow;
  const meta = flowMeta(flow);
  const [verdict, setVerdict] = useState<"totally_off" | "close_but_off">("close_but_off");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const stored = useMemo(() => readStoredDestiny(flow), [flow]);

  async function onContinue() {
    if (!stored) return;
    setBusy(true);
    setMessage("");
    try {
      if (verdict === "totally_off") {
        await submitDestinyFeedback({
          sessionId: stored.sessionId,
          destinyId: stored.destinyId,
          choice: "miss",
          stage: "reroll_gate",
          rerollReason: "wrong_goals",
          rerollVerdict: "totally_off",
          note: note.trim() || undefined,
        });
        navigate(meta.restartPath);
        return;
      }

      const intentSnapshot = stored.intentSnapshot ?? readBuildIntent(meta.storageKey);
      const request: RecommendRequest = {
        entryPath: meta.entryPath,
        sessionId: stored.sessionId,
        signals: {
          ...(intentSnapshot ?? {}),
          freeform: note.trim() ? `retool request: ${note.trim()}`.slice(0, 240) : undefined,
          preferredClass: stored.output.classId,
          recommendLane: "experimental",
          memoryHints: buildMemoryHints(),
        },
      };
      const reroll = await fetchDestiny(request);
      await submitDestinyFeedback({
        sessionId: stored.sessionId,
        destinyId: stored.destinyId,
        choice: "almost_right",
        stage: "reroll_gate",
        rerollReason: "almost_right",
        rerollVerdict: "close_but_off",
        note: note.trim() || undefined,
        rerollFromClassId: stored.output.classId,
        rerollToClassId: reroll.output.classId,
      });
      writeStoredDestiny(flow, {
        sessionId: reroll.sessionId,
        destinyId: reroll.destinyId,
        output: reroll.output,
        intentSnapshot: intentSnapshot ?? undefined,
        experimentalLane: reroll.experimentalLane,
        experimentalCandidate: reroll.experimentalCandidate,
      });
      sessionStorage.setItem(meta.sessionKey, reroll.sessionId);
      sessionStorage.setItem(meta.destinyKey, reroll.destinyId);
      navigate(meta.resultPath);
    } catch (err) {
      setMessage(flowApiErrorHint(err));
    } finally {
      setBusy(false);
    }
  }

  if (!stored) {
    return (
      <div className="card">
        <p className="step-label">Reroll triage</p>
        <h1 className="hero-question">No active result</h1>
        <p className="hero-sub">Generate a card first, then reroll from result.</p>
        <Link to="/" className="btn-primary">
          Home
        </Link>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="step-label">Reroll triage</p>
      <h1 className="hero-question">What felt off?</h1>
      <p className="hero-sub">One reroll button, then tell us if it was close or totally off so we can tune future picks.</p>
      <div className="flow-nav flow-nav--wrap" style={{ marginTop: 10 }}>
        <button type="button" className={`btn-ghost ${verdict === "close_but_off" ? "chip-btn--on" : ""}`} onClick={() => setVerdict("close_but_off")}>
          Close, retool this
        </button>
        <button type="button" className={`btn-ghost ${verdict === "totally_off" ? "chip-btn--on" : ""}`} onClick={() => setVerdict("totally_off")}>
          Totally off, restart
        </button>
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, 240))}
        placeholder="Optional freeform feedback for better rerolls and global template tuning."
        style={{ width: "100%", minHeight: 90, marginTop: 10 }}
      />
      <div className="flow-nav" style={{ marginTop: 12 }}>
        <button type="button" className="btn-primary" disabled={busy} onClick={() => void onContinue()}>
          {busy ? "Working..." : "Continue"}
        </button>
        <button type="button" className="btn-ghost" onClick={() => navigate(meta.resultPath)} disabled={busy}>
          Back
        </button>
      </div>
      {message ? (
        <p className="hero-sub" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}
    </div>
  );
}
