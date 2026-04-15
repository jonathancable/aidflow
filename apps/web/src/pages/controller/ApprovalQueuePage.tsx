// apps/web/src/pages/controller/ApprovalQueuePage.tsx
import { useState } from "react";
import { createPortal } from "react-dom";
import { useApprovalQueue, useResolveApproval } from "@hooks/useApprovals";

interface Approval {
  id: string;
  entityType: string;
  requestedBy?: { fullName: string } | null;
  createdAt: string;
}

function ResolveModal({
  approval,
  onClose,
}: {
  approval: Approval;
  onClose: () => void;
}) {
  const [decision, setDecision] = useState<"approved" | "rejected">("approved");
  const [notes, setNotes] = useState("");
  const resolve = useResolveApproval();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await resolve.mutateAsync({ id: approval.id, decision, notes });
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: "var(--color-background-primary)",
          borderRadius: "var(--border-radius-lg)",
          border: "0.5px solid var(--color-border-tertiary)",
          padding: "1.5rem",
          width: 440,
          maxWidth: "90vw",
        }}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 500,
            margin: "0 0 4px",
            color: "var(--color-text-primary)",
          }}
        >
          Review approval
        </h3>
        <p
          style={{
            fontSize: 13,
            color: "var(--color-text-secondary)",
            margin: "0 0 1.25rem",
          }}
        >
          {approval.entityType} · requested by {approval.requestedBy?.fullName}
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {(["approved", "rejected"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDecision(d)}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "var(--border-radius-md)",
                  fontSize: 13,
                  fontWeight: decision === d ? 500 : 400,
                  background:
                    decision === d
                      ? d === "approved"
                        ? "var(--color-background-success)"
                        : "var(--color-background-danger)"
                      : "var(--color-background-secondary)",
                  color:
                    decision === d
                      ? d === "approved"
                        ? "var(--color-text-success)"
                        : "var(--color-text-danger)"
                      : "var(--color-text-secondary)",
                  border:
                    "0.5px solid " +
                    (decision === d
                      ? d === "approved"
                        ? "var(--color-border-success)"
                        : "var(--color-border-danger)"
                      : "var(--color-border-tertiary)"),
                  cursor: "pointer",
                }}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                color: "var(--color-text-secondary)",
                marginBottom: 6,
              }}
            >
              Notes {decision === "rejected" && "(required)"}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              required={decision === "rejected"}
              placeholder="Add notes for the requester…"
              style={{ width: "100%", resize: "vertical" }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                background: "var(--color-background-secondary)",
                border: "0.5px solid var(--color-border-secondary)",
                borderRadius: "var(--border-radius-md)",
                cursor: "pointer",
                color: "var(--color-text-secondary)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resolve.isPending}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 500,
                background: "var(--color-text-primary)",
                color: "var(--color-background-primary)",
                border: "none",
                borderRadius: "var(--border-radius-md)",
                cursor: "pointer",
                opacity: resolve.isPending ? 0.6 : 1,
              }}
            >
              {resolve.isPending ? "Submitting…" : "Submit decision"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ApprovalQueuePage() {
  const { data, isLoading } = useApprovalQueue({ status: "pending" });
  const [selected, setSelected] = useState<Approval | null>(null);
  const approvals: Approval[] = data?.data ?? [];

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
        Approval queue
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "var(--color-text-secondary)",
          marginBottom: "1.5rem",
        }}
      >
        {isLoading ? "Loading…" : (data?.meta?.total ?? 0) + " pending"}
      </p>

      {approvals.length === 0 && !isLoading && (
        <p style={{ fontSize: 14, color: "var(--color-text-tertiary)" }}>
          No pending approvals.
        </p>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          background: "var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          overflow: "hidden",
        }}
      >
        {approvals.map((a) => (
          <div
            key={a.id}
            style={{
              background: "var(--color-background-primary)",
              padding: "0.875rem 1rem",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ flex: 1 }}>
              <p
                style={{
                  margin: "0 0 2px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--color-text-primary)",
                  textTransform: "capitalize",
                }}
              >
                {a.entityType.replace("_", " ")}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "var(--color-text-secondary)",
                }}
              >
                Requested by {a.requestedBy?.fullName} ·{" "}
                {new Date(a.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => setSelected(a)}
              style={{
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 500,
                background: "var(--color-background-info)",
                color: "var(--color-text-info)",
                border: "0.5px solid var(--color-border-info)",
                borderRadius: "var(--border-radius-md)",
                cursor: "pointer",
              }}
            >
              Review
            </button>
          </div>
        ))}
      </div>

      {selected && createPortal(
        <ResolveModal approval={selected} onClose={() => setSelected(null)} />,
        document.body,
      )}
    </div>
  );
}
