// apps/web/src/pages/donor/ContributionsPage.tsx
import { useState } from "react";
import { useContributions } from "@hooks/useContributions";

const STATUS_COLORS: Record<string, string> = {
  confirmed:  "var(--color-text-success)",
  pending:    "var(--color-text-warning)",
  cancelled:  "var(--color-text-danger)",
};

export default function ContributionsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useContributions({ page, limit: 20 });
  const items: any[] = data?.data ?? [];
  const total: number = data?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <div>
      <h1
        style={{
          fontSize: 22,
          fontWeight: 500,
          color: "var(--color-text-primary)",
          marginBottom: "0.25rem",
        }}
      >
        My contributions
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "var(--color-text-secondary)",
          marginBottom: "1.5rem",
        }}
      >
        {total} contribution{total !== 1 ? "s" : ""} total
      </p>

      <div
        style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-lg)",
          overflow: "hidden",
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 120px 120px 100px",
            gap: 8,
            padding: "0.75rem 1.25rem",
            borderBottom: "0.5px solid var(--color-border-tertiary)",
            fontSize: 12,
            color: "var(--color-text-tertiary)",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          <span>Program</span>
          <span>Amount</span>
          <span>Date</span>
          <span>Status</span>
        </div>

        {isLoading ? (
          <p style={{ padding: "1.25rem", fontSize: 13, color: "var(--color-text-tertiary)" }}>
            Loading…
          </p>
        ) : items.length === 0 ? (
          <p style={{ padding: "1.25rem", fontSize: 13, color: "var(--color-text-tertiary)" }}>
            No contributions yet.
          </p>
        ) : (
          items.map((c: any) => (
            <div
              key={c.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 120px 120px 100px",
                gap: 8,
                padding: "0.75rem 1.25rem",
                borderBottom: "0.5px solid var(--color-border-tertiary)",
                alignItems: "center",
              }}
            >
              <span
                style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}
              >
                {c.program?.name ?? c.programId.slice(0, 8) + "…"}
              </span>
              <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>
                ${Number(c.amount).toLocaleString()}
              </span>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                {new Date(c.createdAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: STATUS_COLORS[c.status] ?? "var(--color-text-secondary)",
                  textTransform: "capitalize",
                }}
              >
                {c.status}
              </span>
            </div>
          ))
        )}

        {/* Pagination */}
        {!isLoading && items.length > 0 && (
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
