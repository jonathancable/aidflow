// apps/web/src/pages/admin/VendorOrdersPage.tsx
import { useState } from "react";
import { useVendorOrgs, useCreateVendorOrder, useVendorOrders } from "@hooks/useVendorOrders";
import { useBatches } from "@hooks/useBatches";

const STATUS_COLOR: Record<string, string> = {
  issued: "var(--color-text-warning)",
  acknowledged: "var(--color-text-primary)",
  in_delivery: "var(--color-text-info)",
  delivered: "var(--color-text-success)",
  settled: "var(--color-text-success)",
  cancelled: "var(--color-text-danger)",
};

type OrderItem = { description: string; quantity: number; unitPrice: number };

const EMPTY_ITEM: OrderItem = { description: "", quantity: 1, unitPrice: 0 };

export default function VendorOrdersPage() {
  const { data: orgsData } = useVendorOrgs();
  const { data: batchesData } = useBatches({ status: "released" });
  const { data: ordersData, isLoading } = useVendorOrders();
  const createOrder = useCreateVendorOrder();

  const orgs = orgsData?.data ?? [];
  const batches: any[] = batchesData?.data ?? [];
  const orders: any[] = ordersData?.data ?? [];
  const total: number = ordersData?.meta?.total ?? 0;

  const [showForm, setShowForm] = useState(false);
  const [vendorOrgId, setVendorOrgId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [items, setItems] = useState<OrderItem[]>([{ ...EMPTY_ITEM }]);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState("");

  const selectedBatch = batches.find((b) => b.id === batchId);
  const programId: string = selectedBatch?.programId ?? "";

  const totalValue = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const handleItemChange = (idx: number, field: keyof OrderItem, value: string) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === idx
          ? { ...item, [field]: field === "description" ? value : Number(value) }
          : item,
      ),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitted(null);
    if (!programId) { setError("Selected batch has no program linked."); return; }
    try {
      const result = await createOrder.mutateAsync({
        vendorOrgId,
        batchId,
        programId,
        items,
        totalValue: Math.round(totalValue * 100) / 100,
      });
      setSubmitted(result.data?.id ?? "created");
      setVendorOrgId("");
      setBatchId("");
      setItems([{ ...EMPTY_ITEM }]);
      setShowForm(false);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? "Failed to create order");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>
          Vendor Orders
        </h1>
        <button
          onClick={() => { setShowForm((v) => !v); setSubmitted(null); setError(""); }}
          style={{
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 500,
            background: "var(--color-text-primary)",
            color: "var(--color-background-primary)",
            border: "none",
            borderRadius: "var(--border-radius-md)",
            cursor: "pointer",
          }}
        >
          {showForm ? "Cancel" : "New order"}
        </button>
      </div>

      {submitted && (
        <div style={{ background: "var(--color-background-success)", border: "0.5px solid var(--color-border-success)", borderRadius: "var(--border-radius-md)", padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "var(--color-text-success)" }}>
          Vendor order created — vendor can now view and acknowledge it.
        </div>
      )}

      {showForm && (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1.25rem", maxWidth: 560, marginBottom: "2rem" }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, margin: "0 0 1rem", color: "var(--color-text-primary)" }}>
            Create vendor order
          </h2>

          {error && (
            <div style={{ background: "var(--color-background-danger)", border: "0.5px solid var(--color-border-danger)", borderRadius: "var(--border-radius-md)", padding: "8px 12px", marginBottom: 14, fontSize: 13, color: "var(--color-text-danger)" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 5 }}>Vendor organisation</label>
              <select value={vendorOrgId} onChange={(e) => setVendorOrgId(e.target.value)} required style={{ width: "100%" }}>
                <option value="">Select vendor…</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 5 }}>Released batch</label>
              <select value={batchId} onChange={(e) => setBatchId(e.target.value)} required style={{ width: "100%" }}>
                <option value="">Select batch…</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.program?.name ?? b.id.slice(0, 8)} — ${Number(b.totalAmount).toLocaleString()}
                  </option>
                ))}
              </select>
              {programId && (
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--color-text-tertiary)", fontFamily: "monospace" }}>
                  Program: {programId}
                </p>
              )}
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 8 }}>Line items</label>
              {items.map((item, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 32px", gap: 6, marginBottom: 6, alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                    required
                    style={{ fontSize: 12 }}
                  />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                    required
                    style={{ fontSize: 12 }}
                  />
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Unit price"
                    value={item.unitPrice || ""}
                    onChange={(e) => handleItemChange(idx, "unitPrice", e.target.value)}
                    required
                    style={{ fontSize: 12 }}
                  />
                  <button
                    type="button"
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                    disabled={items.length === 1}
                    style={{ fontSize: 14, background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", padding: 0 }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setItems((prev) => [...prev, { ...EMPTY_ITEM }])}
                style={{ fontSize: 12, color: "var(--color-text-secondary)", background: "none", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "4px 10px", cursor: "pointer", marginTop: 4 }}
              >
                + Add item
              </button>
              {totalValue > 0 && (
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--color-text-secondary)" }}>
                  Total: <strong>${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={createOrder.isPending || !programId}
              style={{
                alignSelf: "flex-start",
                padding: "9px 20px",
                fontSize: 13,
                fontWeight: 500,
                background: "var(--color-text-primary)",
                color: "var(--color-background-primary)",
                border: "none",
                borderRadius: "var(--border-radius-md)",
                cursor: createOrder.isPending || !programId ? "not-allowed" : "pointer",
                opacity: createOrder.isPending || !programId ? 0.6 : 1,
              }}
            >
              {createOrder.isPending ? "Creating…" : "Create order"}
            </button>
          </form>
        </div>
      )}

      {/* Orders list */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>All vendor orders</p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-tertiary)" }}>{total} total</p>
        </div>
        {isLoading ? (
          <p style={{ padding: "1rem 1.25rem", fontSize: 13, color: "var(--color-text-tertiary)" }}>Loading…</p>
        ) : orders.length === 0 ? (
          <p style={{ padding: "1rem 1.25rem", fontSize: 13, color: "var(--color-text-tertiary)" }}>No vendor orders yet.</p>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 120px 120px", padding: "0.5rem 1.25rem", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              {["Order ID", "Vendor", "Value", "Status", "Date"].map((h) => (
                <span key={h} style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>
            {orders.map((o: any) => (
              <div key={o.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 120px 120px", padding: "0.75rem 1.25rem", borderBottom: "0.5px solid var(--color-border-tertiary)", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontFamily: "monospace", color: "var(--color-text-primary)" }}>{o.id.slice(0, 8)}…</span>
                <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{o.vendorOrgId?.slice(0, 8)}…</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>${Number(o.totalValue).toLocaleString()}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: STATUS_COLOR[o.status] ?? "var(--color-text-secondary)", textTransform: "capitalize" }}>{o.status}</span>
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                  {new Date(o.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
