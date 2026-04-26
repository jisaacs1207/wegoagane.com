import { Navigate, Route, Routes } from "react-router-dom";
import { PlanFreeformStep } from "./plan/PlanFreeformStep";
import { PlanIntentStep } from "./plan/PlanIntentStep";
import { PlanJourneyStep } from "./plan/PlanJourneyStep";

export function PlanFlowPage() {
  return (
    <Routes>
      <Route index element={<Navigate to="intent" replace />} />
      <Route path="intent" element={<PlanIntentStep />} />
      <Route path="freeform" element={<PlanFreeformStep />} />
      <Route path="journey" element={<PlanJourneyStep />} />
      {/*
        The legacy `result` step is gone. After generation we navigate straight to
        /build/commit/:slug which is the single canonical post-generation surface.
      */}
      <Route path="*" element={<Navigate to="intent" replace />} />
    </Routes>
  );
}
