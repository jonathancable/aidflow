// apps/web/src/features/layouts/AdminLayout.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import UsersPage from "@pages/admin/UsersPage";
import ControllerDashboard from "@pages/controller/ControllerDashboard";

const NAV = [
  { label: "Overview", href: "/admin/dashboard" },
  { label: "Users", href: "/admin/users" },
];

export default function AdminLayout() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--color-background-tertiary)",
      }}
    >
      <Sidebar title="AidFlow" items={NAV} roleTag="Admin" />
      <main style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        <Routes>
          <Route path="dashboard" element={<ControllerDashboard />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
