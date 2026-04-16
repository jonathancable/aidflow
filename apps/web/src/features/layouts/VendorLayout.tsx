// apps/web/src/features/layouts/VendorLayout.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import OrdersPage from "@pages/vendor/OrdersPage";

const NAV = [{ label: "Orders", href: "/vendor/orders" }];

export default function VendorLayout() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--color-background-tertiary)",
      }}
    >
      <Sidebar title="AidFlow" items={NAV} roleTag="Vendor" />
      <main style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        <Routes>
          <Route path="orders" element={<OrdersPage />} />
          <Route path="*" element={<Navigate to="orders" replace />} />
        </Routes>
      </main>
    </div>
  );
}
