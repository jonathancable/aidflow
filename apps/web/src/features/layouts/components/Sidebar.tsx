// apps/web/src/features/layouts/components/Sidebar.tsx
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "@stores/auth.store";
import { apiClient } from "@lib/api-client";

interface NavItem {
  label: string;
  href: string;
}

interface Props {
  title: string;
  items: NavItem[];
  roleTag: string;
}

export function Sidebar({ title: _title, items, roleTag }: Props) {
  const { user, logout } = useAuthStore((s) => ({
    user: s.user,
    logout: s.logout,
  }));
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch { /* best-effort — logout proceeds regardless */ }
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside
      style={{
        width: 220,
        minHeight: "100vh",
        background: "var(--color-background-primary)",
        borderRight: "0.5px solid var(--color-border-tertiary)",
        display: "flex",
        flexDirection: "column",
        padding: "1.25rem 0",
      }}
    >
      <div
        style={{
          padding: "0 1.25rem 1.25rem",
          borderBottom: "0.5px solid var(--color-border-tertiary)",
        }}
      >
        <p
          style={{
            margin: "0 0 2px",
            fontSize: 16,
            fontWeight: 500,
            color: "var(--color-text-primary)",
          }}
        >
          AidFlow
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            color: "var(--color-text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {roleTag}
        </p>
      </div>
      <nav
        style={{
          flex: 1,
          padding: "1rem 0.75rem",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {items.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            style={({ isActive }) => ({
              display: "block",
              padding: "7px 12px",
              borderRadius: "var(--border-radius-md)",
              fontSize: 13,
              textDecoration: "none",
              fontWeight: isActive ? 500 : 400,
              color: isActive
                ? "var(--color-text-primary)"
                : "var(--color-text-secondary)",
              background: isActive
                ? "var(--color-background-secondary)"
                : "transparent",
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div
        style={{
          padding: "0.75rem 1.25rem",
          borderTop: "0.5px solid var(--color-border-tertiary)",
        }}
      >
        <p
          style={{
            margin: "0 0 6px",
            fontSize: 13,
            color: "var(--color-text-secondary)",
          }}
        >
          {user?.name}
        </p>
        <button
          onClick={handleLogout}
          style={{
            fontSize: 12,
            color: "var(--color-text-tertiary)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
