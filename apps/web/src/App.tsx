import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { DeathFlowPage } from "./pages/DeathFlowPage";
import { HomePage } from "./pages/HomePage";
import { LuckyFlowPage } from "./pages/LuckyFlowPage";
import { PlanFlowPage } from "./pages/PlanFlowPage";
import { DesignCardsPage } from "./pages/DesignCardsPage";
import { SharePlaceholderPage } from "./pages/SharePlaceholderPage";
import { FeedbackSummaryPage } from "./pages/FeedbackSummaryPage";
import { GrowthOpsPage } from "./pages/GrowthOpsPage";
import { BuildPlanPage } from "./pages/BuildPlanPage";
import { BuildCommitPage } from "./pages/BuildCommitPage";
import { RerollTriagePage } from "./pages/RerollTriagePage";

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/release-spirit/*" element={<DeathFlowPage />} />
        <Route path="/draft-a-run/*" element={<PlanFlowPage />} />
        <Route path="/lucky-roll/*" element={<LuckyFlowPage />} />
        <Route path="/build/:destinyId" element={<BuildPlanPage />} />
        <Route path="/build/commit/:slug" element={<BuildCommitPage />} />
        <Route path="/reroll/:flow" element={<RerollTriagePage />} />
        <Route path="/share/:runId" element={<SharePlaceholderPage />} />
        <Route path="/design/cards" element={<DesignCardsPage />} />
        <Route path="/ops/feedback" element={<FeedbackSummaryPage />} />
        <Route path="/ops/growth" element={<GrowthOpsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
