import { Navigate, Route, Routes } from "react-router-dom";
import { DeathDetailStep } from "./death/DeathDetailStep";
import { DeathMoodStep } from "./death/DeathMoodStep";
import { DeathNextSignalStep } from "./death/DeathNextSignalStep";
import { DeathResultStep } from "./death/DeathResultStep";

export function DeathFlowPage() {
  return (
    <Routes>
      <Route index element={<Navigate to="mood" replace />} />
      <Route path="mood" element={<DeathMoodStep />} />
      <Route path="next" element={<DeathNextSignalStep />} />
      <Route path="detail" element={<DeathDetailStep />} />
      <Route path="result" element={<DeathResultStep />} />
      <Route path="*" element={<Navigate to="mood" replace />} />
    </Routes>
  );
}
