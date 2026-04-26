import { Navigate, Route, Routes } from "react-router-dom";
import { DeathDetailStep } from "./death/DeathDetailStep";
import { DeathJourneyStep } from "./death/DeathJourneyStep";
import { DeathMoodStep } from "./death/DeathMoodStep";
import { DeathNextSignalStep } from "./death/DeathNextSignalStep";

export function DeathFlowPage() {
  return (
    <Routes>
      <Route index element={<Navigate to="next" replace />} />
      <Route path="mood" element={<DeathMoodStep />} />
      <Route path="next" element={<DeathNextSignalStep />} />
      <Route path="detail" element={<DeathDetailStep />} />
      <Route path="journey" element={<DeathJourneyStep />} />
      {/* Result step deleted; journey step navigates straight to /build/commit/:slug. */}
      <Route path="*" element={<Navigate to="next" replace />} />
    </Routes>
  );
}
