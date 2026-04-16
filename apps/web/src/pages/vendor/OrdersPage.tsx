// apps/web/src/pages/vendor/OrdersPage.tsx
import { useState } from "react";
import { useVendorOrders, useAcknowledgeOrder, useDeliverOrder } from "@hooks/useVendorOrders";

const STATUS_COLOR: Record<string, string> = {
  pending:      "var(--color-text-warning)",
  acknowledged: "var(--color-text-primary)",
  delivered:    "var(--color-text-success)",
  settled:      "var(--color-text-success)",
  cancelled:    "var(--color-text-danger)",
};

export default function OrdersPage() {
  const [page] = useState(1);
  const { data, isLoading } = useVendorOrders({ page });
  const acknowledge = useAcknowledgeOrder();
  const deliver = useDeliverOrder();

  const [proofModal, setProofModal] = useState<string | null>(null); // orderId
  const [proofUrl, setProofUrl] = useState("");

  const orders: any[] = data?.data ?? [];
  const total: number = data?.meta?.total ?? 0;

  const handleDeliver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofModal) return;
    try {
      await deliver.mutateAsync({ id: proofModal, deliveryProofUrl: proofUrl });
      setProofModal(null);
      setProofUrl("");
    } catch { /* error surfaced via deliver.isError */ }
  };

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
        Orders
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "var(--color-text-secondary)",
          marginBottom: "1.5rem",
        }}
      >
        {total} order{total !== 1 ? "s" : ""} total
      </p>

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
            gridTemplateColumns: "1fr 100px 100px 120px 140px",
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
          <span>Order</span>
          <span>Value</span>
          <span>Status</span>
          <span>Date</span>
          <span>Action</span>
        </div>

        {isLoading ? (
          <p style={{ padding: "1.25rem", fontSize: 13, color: "var(--color-text-tertiary)" }}>
            Loading…
          </p>
        ) : orders.length === 0 ? (
          <p style={{ padding: "1.25rem", fontSize: 13, color: "var(--color-text-tertiary)" }}>
            No orders yet.
          </p>
        ) : (
          orders.map((o: any) => (
            <div
              key={o.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 100px 100px 120px 140px",
                gap: 8,
                padding: "0.75rem 1.25rem",
                borderBottom: "0.5px solid var(--color-border-tertiary)",
                alignItems: "center",
              }}
            >
              <div>
                <p
                  style={{
                    margin: "0 0 2px",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--color-text-primary)",
                    fontFamily: "monospace",
                  }}
                >
                  {o.id.slice(0, 8)}…
                </p>
                <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-tertiary)" }}>
                  {o.items?.length ?? 0} item{(o.items?.length ?? 0) !== 1 ? "s" : ""}
                </p>
              </div>
              <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>
                ${Number(o.totalValue).toLocaleString()}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: STATUS_COLOR[o.status] ?? "var(--color-text-secondary)",
                  textTransform: "capitalize",
                }}
              >
                {o.status}
              </span>
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                {new Date(o.createdAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                {o.status === "pending" && (
                  <button
                    disabled={acknowledge.isPending}
                    onClick={() => acknowledge.mutate(o.id)}
                    style={{
                      fontSize: 11,
                      padding: "4px 10px",
                      background: "var(--color-background-secondary)",
                      border: "0.5px solid var(--color-border-secondary)",
                      borderRadius: "var(--border-radius-md)",
                      cursor: "pointer",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    Acknowledge
                  </button>
                )}
                {o.status === "acknowledged" && (
                  <button
                    onClick={() => { setProofModal(o.id); setProofUrl(""); }}
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
                    Mark delivered
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delivery proof modal */}
      {proofModal && (
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
          onClick={() => setProofModal(null)}
        >
          <div
            style={{
              background: "var(--color-background-primary)",
              borderRadius: "var(--border-radius-lg)",
              padding: "1.5rem",
              width: 420,
              maxWidth: "90vw",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                margin: "0 0 1rem",
                fontSize: 16,
                fontWeight: 500,
                color: "var(--color-text-primary)",
              }}
            >
              Confirm delivery
            </h3>
            <form onSubmit={handleDeliver}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  color: "var(--color-text-secondary)",
                  marginBottom: 6,
                }}
              >
                Delivery proof URL
              </label>
              <input
                type="url"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="https://…"
                required
                autoFocus
                style={{ width: "100%", marginBottom: 16, fontSize: 13 }}
              />
              {deliver.isError && (
                <p style={{ fontSize: 12, color: "var(--color-text-danger)", marginBottom: 12 }}>
                  Submission failed — check URL and try again.
                </p>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setProofModal(null)}
                  style={{
                    fontSize: 13,
                    padding: "7px 16px",
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
                  disabled={deliver.isPending}
                  style={{
                    fontSize: 13,
                    padding: "7px 16px",
                    background: "var(--color-text-success)",
                    border: "none",
                    borderRadius: "var(--border-radius-md)",
                    cursor: "pointer",
                    color: "#fff",
                    fontWeight: 500,
                    opacity: deliver.isPending ? 0.6 : 1,
                  }}
                >
                  {deliver.isPending ? "Submitting…" : "Confirm delivery"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
