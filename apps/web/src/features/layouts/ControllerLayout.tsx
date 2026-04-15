// apps/web/src/features/layouts/ControllerLayout.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import ControllerDashboard from "@pages/controller/ControllerDashboard";
import ApprovalQueuePage from "@pages/controller/ApprovalQueuePage";
import ReportsPage from "@pages/controller/ReportsPage";

const NAV = [
  { label: "Dashboard", href: "/controller/dashboard" },
  { label: "Approval queue", href: "/controller/approvals" },
  { label: "Reports", href: "/controller/reports" },
];

export default function ControllerLayout() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--color-background-tertiary)",
      }}
    >
      <Sidebar title="AidFlow" items={NAV} roleTag="Controller" />
      <main style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        <Routes>
          <Route path="dashboard" element={<ControllerDashboard />} />
          <Route path="approvals" element={<ApprovalQueuePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
