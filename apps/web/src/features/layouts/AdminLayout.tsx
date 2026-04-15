import { Outlet } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div>
      <p style={{ padding: "1rem", color: "grey" }}>Admin layout (S5)</p>
      <Outlet />
    </div>
  );
}
