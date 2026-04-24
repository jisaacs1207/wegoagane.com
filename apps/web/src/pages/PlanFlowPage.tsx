import { Navigate, Route, Routes } from "react-router-dom";
import { PlanFreeformStep } from "./plan/PlanFreeformStep";
import { PlanIntentStep } from "./plan/PlanIntentStep";
import { PlanJourneyStep } from "./plan/PlanJourneyStep";
import { PlanResultStep } from "./plan/PlanResultStep";

export function PlanFlowPage() {
  return (
    <Routes>
      <Route index element={<Navigate to="intent" replace />} />
      <Route path="intent" element={<PlanIntentStep />} />
      <Route path="freeform" element={<PlanFreeformStep />} />
      <Route path="journey" element={<PlanJourneyStep />} />
      <Route path="result" element={<PlanResultStep />} />
      <Route path="*" element={<Navigate to="intent" replace />} />
    </Routes>
  );
}
