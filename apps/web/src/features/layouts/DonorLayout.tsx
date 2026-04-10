// apps/web/src/features/layouts/DonorLayout.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import DonorDashboard from "@pages/donor/DonorDashboard";
import ContributionsPage from "@pages/donor/ContributionsPage";
import WalletPage from "@pages/donor/WalletPage";
import ProgramsPage from "@pages/donor/ProgramsPage";

const NAV = [
  { label: "Dashboard", href: "/donor/dashboard" },
  { label: "Programs", href: "/donor/programs" },
  { label: "My wallet", href: "/donor/wallet" },
  { label: "Contributions", href: "/donor/contributions" },
];

export default function DonorLayout() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--color-background-tertiary)",
      }}
    >
      <Sidebar title="AidFlow" items={NAV} roleTag="Donor" />
      <main style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        <Routes>
          <Route path="dashboard" element={<DonorDashboard />} />
          <Route path="programs" element={<ProgramsPage />} />
          <Route path="wallet" element={<WalletPage />} />
          <Route path="contributions" element={<ContributionsPage />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
