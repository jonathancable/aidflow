// apps/web/src/features/layouts/NGOLayout.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import NGOProgramsPage from "@pages/ngo/ProgramsPage";
import BeneficiariesPage from "@pages/ngo/BeneficiariesPage";

const NAV = [
  { label: "Programs", href: "/ngo/programs" },
  { label: "Beneficiaries", href: "/ngo/beneficiaries" },
];

export default function NGOLayout() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--color-background-tertiary)",
      }}
    >
      <Sidebar title="AidFlow" items={NAV} roleTag="NGO" />
      <main style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        <Routes>
          <Route path="programs" element={<NGOProgramsPage />} />
          <Route path="beneficiaries" element={<BeneficiariesPage />} />
          <Route path="*" element={<Navigate to="programs" replace />} />
        </Routes>
      </main>
    </div>
  );
}
