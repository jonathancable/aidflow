// apps/web/src/pages/admin/UsersPage.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@lib/api-client";

function useUsers(params: { page: number; status?: string }) {
  return useQuery({
    queryKey: ["users", "list", params],
    queryFn: async () => {
      const { data } = await apiClient.get("/users", { params });
      return data;
    },
  });
}

function useActivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch(`/users/${id}/activate`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

const ROLE_LABEL: Record<string, string> = {
  system_admin:       "Admin",
  system_controller:  "Controller",
  donor:              "Donor",
  ngo:                "NGO",
  vendor:             "Vendor",
};

const STATUS_COLOR: Record<string, string> = {
  active:   "var(--color-text-success)",
  pending:  "var(--color-text-warning)",
  inactive: "var(--color-text-danger)",
  suspended:"var(--color-text-danger)",
};

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const { data, isLoading } = useUsers({ page, ...(statusFilter ? { status: statusFilter } : {}) });
  const activateUser = useActivateUser();

  const users: any[] = data?.data ?? [];
  const total: number = data?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / 50) || 1;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1
            style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}
          >
            Users
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--color-text-secondary)" }}>
            {total} user{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Filter:</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ fontSize: 12 }}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div
        style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-lg)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 140px 100px 120px 100px",
            gap: 8,
            padding: "0.65rem 1.25rem",
            borderBottom: "0.5px solid var(--color-border-tertiary)",
            fontSize: 11,
            color: "var(--color-text-tertiary)",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          <span>User</span>
          <span>Email</span>
          <span>Role</span>
          <span>Status</span>
          <span>Action</span>
        </div>

        {isLoading ? (
          <p style={{ padding: "1.25rem", fontSize: 13, color: "var(--color-text-tertiary)" }}>
            Loading…
          </p>
        ) : users.length === 0 ? (
          <p style={{ padding: "1.25rem", fontSize: 13, color: "var(--color-text-tertiary)" }}>
            No users found.
          </p>
        ) : (
          users.map((u: any) => (
            <div
              key={u.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 140px 100px 120px 100px",
                gap: 8,
                padding: "0.75rem 1.25rem",
                borderBottom: "0.5px solid var(--color-border-tertiary)",
                alignItems: "center",
              }}
            >
              <div>
                <p style={{ margin: "0 0 1px", fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
                  {u.fullName}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-tertiary)", fontFamily: "monospace" }}>
                  {u.id.slice(0, 8)}…
                </p>
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--color-text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {u.email}
              </span>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                {ROLE_LABEL[u.role] ?? u.role}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: STATUS_COLOR[u.status] ?? "var(--color-text-secondary)",
                  textTransform: "capitalize",
                }}
              >
                {u.status}
              </span>
              <div>
                {u.status === "pending" && (
                  <button
                    disabled={activateUser.isPending}
                    onClick={() => activateUser.mutate(u.id)}
                    style={{
                      fontSize: 11,
                      padding: "4px 10px",
                      background: "var(--color-text-success)",
                      border: "none",
                      borderRadius: "var(--border-radius-md)",
                      cursor: "pointer",
                      color: "#fff",
                      fontWeight: 500,
                    }}
                  >
                    Activate
                  </button>
                )}
              </div>
            </div>
          ))
        )}

        {!isLoading && users.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.75rem 1.25rem",
            }}
          >
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              style={{
                fontSize: 12,
                padding: "5px 12px",
                cursor: page <= 1 ? "default" : "pointer",
                background: "var(--color-background-secondary)",
                border: "0.5px solid var(--color-border-secondary)",
                borderRadius: "var(--border-radius-md)",
                color: "var(--color-text-secondary)",
                opacity: page <= 1 ? 0.4 : 1,
              }}
            >
              Previous
            </button>
            <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={{
                fontSize: 12,
                padding: "5px 12px",
                cursor: page >= totalPages ? "default" : "pointer",
                background: "var(--color-background-secondary)",
                border: "0.5px solid var(--color-border-secondary)",
                borderRadius: "var(--border-radius-md)",
                color: "var(--color-text-secondary)",
                opacity: page >= totalPages ? 0.4 : 1,
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
