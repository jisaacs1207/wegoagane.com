import { Navigate, Route, Routes } from "react-router-dom";
import { LuckyJourneyStep } from "./lucky/LuckyJourneyStep";

export function LuckyFlowPage() {
  return (
    <Routes>
      <Route index element={<Navigate to="journey" replace />} />
      <Route path="journey" element={<LuckyJourneyStep />} />
      {/* Result step deleted; journey step navigates straight to /build/commit/:slug. */}
      <Route path="*" element={<Navigate to="journey" replace />} />
    </Routes>
  );
}
