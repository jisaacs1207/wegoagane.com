import { Navigate, Route, Routes } from "react-router-dom";
import { LuckyJourneyStep } from "./lucky/LuckyJourneyStep";
import { LuckyResultStep } from "./lucky/LuckyResultStep";

export function LuckyFlowPage() {
  return (
    <Routes>
      <Route index element={<Navigate to="journey" replace />} />
      <Route path="journey" element={<LuckyJourneyStep />} />
      <Route path="result" element={<LuckyResultStep />} />
      <Route path="*" element={<Navigate to="journey" replace />} />
    </Routes>
  );
}

