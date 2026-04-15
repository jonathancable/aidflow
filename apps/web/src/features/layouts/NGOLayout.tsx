import { Outlet } from "react-router-dom";

export default function NGOLayout() {
  return (
    <div>
      <p style={{ padding: "1rem", color: "grey" }}>NGO layout (S5)</p>
      <Outlet />
    </div>
  );
}
