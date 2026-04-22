import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { DeathFlowPage } from "./pages/DeathFlowPage";
import { HomePage } from "./pages/HomePage";
import { LuckyRollPage } from "./pages/LuckyRollPage";
import { PlanFlowPage } from "./pages/PlanFlowPage";
import { SharePlaceholderPage } from "./pages/SharePlaceholderPage";

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/release-spirit/*" element={<DeathFlowPage />} />
        <Route path="/draft-a-run/*" element={<PlanFlowPage />} />
        <Route path="/lucky-roll" element={<LuckyRollPage />} />
        <Route path="/share/:runId" element={<SharePlaceholderPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
