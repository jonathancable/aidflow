// apps/web/src/pages/admin/AllocationsPage.tsx
import { useState } from "react";
import { useAllocations, useCreateAllocation } from "@hooks/useAllocations";
import { usePrograms } from "@hooks/usePrograms";
import { useWallets } from "@hooks/useWallets";
import type { WalletSummary } from "@hooks/useWallets";

const STATUS_LABEL: Record<string, string> = {
  pending_approval: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  reversed: "Reversed",
};

const STATUS_COLOR: Record<string, string> = {
  pending_approval: "var(--color-text-warning)",
  approved: "var(--color-text-success)",
  rejected: "var(--color-text-danger)",
  reversed: "var(--color-text-secondary)",
};

export default function AllocationsPage() {
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({
    programId: "",
    sourceWalletId: "",
    amount: "",
    notes: "",
  });
  const [submitted, setSubmitted] = useState<{
    approvalId: string;
    amount: number;
  } | null>(null);

  const { data, isLoading } = useAllocations({ page });
  const { data: programsData } = usePrograms({ status: "active" });
  const { data: walletsData } = useWallets();
  const createAllocation = useCreateAllocation();

  const allocations: any[] = data?.data ?? [];
  const total: number = data?.meta?.total ?? 0;
  const programs: any[] = (programsData?.data as any[]) ?? [];
  const allWallets: WalletSummary[] = walletsData?.data ?? [];
  const selectedProgram = programs.find((p) => p.id === form.programId);
  const destWalletId: string = selectedProgram?.walletId ?? "";
  const sourceWallets = allWallets.filter(
    (w) => w.available > 0 && w.id !== destWalletId,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(null);
    try {
      const result = await createAllocation.mutateAsync({
        programId: form.programId,
        sourceWalletId: form.sourceWalletId,
        destWalletId,
        amount: Number(form.amount),
        ...(form.notes ? { notes: form.notes } : {}),
      });
      setSubmitted({
        approvalId: result.meta?.approvalId,
        amount: Number(form.amount),
      });
      setForm({ programId: "", sourceWalletId: "", amount: "", notes: "" });
    } catch {
      /* error rendered via createAllocation.isError */
    }
  };

  return (
    <div>
      <h1
        style={{
          fontSize: 22,
          fontWeight: 500,
          color: "var(--color-text-primary)",
          marginBottom: "1.5rem",
        }}
      >
        Allocations
      </h1>

      {/* New allocation form */}
      <div
        style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-lg)",
          padding: "1.25rem",
          maxWidth: 520,
          marginBottom: "2rem",
        }}
      >
        <h2
          style={{
            fontSize: 15,
            fontWeight: 500,
            margin: "0 0 1rem",
            color: "var(--color-text-primary)",
          }}
        >
          New allocation
        </h2>

        {submitted && (
          <div
            style={{
              background: "var(--color-background-success)",
              border: "0.5px solid var(--color-border-success)",
              borderRadius: "var(--border-radius-md)",
              padding: "10px 14px",
              marginBottom: 16,
              fontSize: 13,
              color: "var(--color-text-success)",
            }}
          >
            Allocation submitted — pending Controller approval.
            Approval ID: <strong>{submitted.approvalId}</strong>
          </div>
        )}

        {createAllocation.isError && (
          <div
            style={{
              background: "var(--color-background-danger)",
              border: "0.5px solid var(--color-border-danger)",
              borderRadius: "var(--border-radius-md)",
              padding: "10px 14px",
              marginBottom: 16,
              fontSize: 13,
              color: "var(--color-text-danger)",
            }}
          >
            {(createAllocation.error as any)?.response?.data?.error?.message ??
              "Failed to create allocation"}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Program (dest wallet auto-filled) */}
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                color: "var(--color-text-secondary)",
                marginBottom: 5,
              }}
            >
              Destination program
            </label>
            <select
              value={form.programId}
              onChange={(e) =>
                setForm((f) => ({ ...f, programId: e.target.value }))
              }
              style={{ width: "100%" }}
              required
            >
              <option value="">Select a program…</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id} disabled={!p.walletId}>
                  {p.name}
                  {!p.walletId ? " (no wallet)" : ""}
                </option>
              ))}
            </select>
            {destWalletId && (
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 11,
                  color: "var(--color-text-tertiary)",
                  fontFamily: "monospace",
                }}
              >
                Dest wallet: {destWalletId}
              </p>
            )}
          </div>

          {/* Source wallet */}
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                color: "var(--color-text-secondary)",
                marginBottom: 5,
              }}
            >
              Source wallet
            </label>
            <select
              value={form.sourceWalletId}
              onChange={(e) =>
                setForm((f) => ({ ...f, sourceWalletId: e.target.value }))
              }
              style={{ width: "100%" }}
              required
            >
              <option value="">Select a wallet…</option>
              {sourceWallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.ownerName} ({w.ownerType}) — ${w.available.toLocaleString()} available
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                color: "var(--color-text-secondary)",
                marginBottom: 5,
              }}
            >
              Amount (USD)
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) =>
                setForm((f) => ({ ...f, amount: e.target.value }))
              }
              placeholder="0.00"
              required
              style={{ width: "100%" }}
            />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                color: "var(--color-text-secondary)",
                marginBottom: 5,
              }}
            >
              Notes (optional)
            </label>
            <textarea
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Reason for allocation…"
              maxLength={1000}
              rows={2}
              style={{ width: "100%", resize: "vertical", fontSize: 13 }}
            />
          </div>

          <button
            type="submit"
            disabled={createAllocation.isPending || !destWalletId}
            style={{
              background: "var(--color-text-primary)",
              color: "var(--color-background-primary)",
              border: "none",
              borderRadius: "var(--border-radius-md)",
              padding: "9px 20px",
              fontSize: 13,
              fontWeight: 500,
              cursor:
                createAllocation.isPending || !destWalletId
                  ? "not-allowed"
                  : "pointer",
              opacity: createAllocation.isPending || !destWalletId ? 0.6 : 1,
            }}
          >
            {createAllocation.isPending ? "Submitting…" : "Submit for approval"}
          </button>
        </form>
      </div>

      {/* Allocations list */}
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
            padding: "1rem 1.25rem",
            borderBottom: "0.5px solid var(--color-border-tertiary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 500,
              color: "var(--color-text-primary)",
            }}
          >
            All allocations
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "var(--color-text-tertiary)",
            }}
          >
            {total} total
          </p>
        </div>

        {isLoading ? (
          <p
            style={{
              padding: "1rem 1.25rem",
              fontSize: 13,
              color: "var(--color-text-tertiary)",
            }}
          >
            Loading…
          </p>
        ) : allocations.length === 0 ? (
          <p
            style={{
              padding: "1rem 1.25rem",
              fontSize: 13,
              color: "var(--color-text-tertiary)",
            }}
          >
            No allocations yet.
          </p>
        ) : (
          <>
            {/* Header row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 120px 120px",
                padding: "0.5rem 1.25rem",
                borderBottom: "0.5px solid var(--color-border-tertiary)",
                background: "var(--color-background-secondary)",
              }}
            >
              {["Program", "Amount", "Status", "Date"].map((h) => (
                <span
                  key={h}
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--color-text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {h}
                </span>
              ))}
            </div>

            {allocations.map((a: any) => (
              <div
                key={a.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 120px 120px",
                  padding: "0.75rem 1.25rem",
                  borderBottom: "0.5px solid var(--color-border-tertiary)",
                  alignItems: "center",
                }}
              >
                <span
                  style={{ fontSize: 13, color: "var(--color-text-primary)" }}
                >
                  {a.program?.name ?? "—"}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--color-text-primary)",
                  }}
                >
                  ${Number(a.amount).toLocaleString()}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: STATUS_COLOR[a.status] ?? "var(--color-text-secondary)",
                  }}
                >
                  {STATUS_LABEL[a.status] ?? a.status}
                </span>
                <span
                  style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}
                >
                  {new Date(a.createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            ))}

            {/* Pagination */}
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
                  cursor: "pointer",
                  background: "var(--color-background-secondary)",
                  border: "0.5px solid var(--color-border-secondary)",
                  borderRadius: "var(--border-radius-md)",
                  color: "var(--color-text-secondary)",
                }}
              >
                Previous
              </button>
              <span
                style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}
              >
                Page {page} of {Math.ceil(total / 20) || 1}
              </span>
              <button
                disabled={page >= Math.ceil(total / 20)}
                onClick={() => setPage((p) => p + 1)}
                style={{
                  fontSize: 12,
                  padding: "5px 12px",
                  cursor: "pointer",
                  background: "var(--color-background-secondary)",
                  border: "0.5px solid var(--color-border-secondary)",
                  borderRadius: "var(--border-radius-md)",
                  color: "var(--color-text-secondary)",
                }}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
