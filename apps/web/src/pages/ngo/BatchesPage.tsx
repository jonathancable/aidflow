// apps/web/src/pages/ngo/BatchesPage.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@lib/api-client";
import {
  useBatches,
  useBatch,
  useCreateBatch,
  useAddBatchItems,
  useSubmitBatch,
  useConfirmDelivery,
} from "@hooks/useBatches";
import { usePrograms } from "@hooks/usePrograms";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  released: "Released",
  completed: "Completed",
  rejected: "Rejected",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "var(--color-text-secondary)",
  pending_approval: "var(--color-text-warning)",
  approved: "var(--color-text-info)",
  released: "var(--color-text-success)",
  completed: "var(--color-text-success)",
  rejected: "var(--color-text-danger)",
};

function BatchDetail({ batchId, onBack }: { batchId: string; onBack: () => void }) {
  const { data, isLoading } = useBatch(batchId);
  const addItems = useAddBatchItems();
  const submitBatch = useSubmitBatch();
  const confirmDelivery = useConfirmDelivery();

  const { data: beneficiariesData } = useQuery({
    queryKey: ["beneficiaries", "list", 1],
    queryFn: async () => {
      const { data } = await apiClient.get("/beneficiaries", { params: { page: 1, limit: 100 } });
      return data;
    },
  });

  const [selectedBeneficiary, setSelectedBeneficiary] = useState("");
  const [entitlement, setEntitlement] = useState("");
  const [confirmUrl, setConfirmUrl] = useState<Record<string, string>>({});
  const [confirmError, setConfirmError] = useState<Record<string, string>>({});

  const batch = data?.data;
  const beneficiaries: any[] = beneficiariesData?.data ?? [];

  if (isLoading) return <p style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Loading…</p>;
  if (!batch) return null;

  const canAddItems = batch.status === "draft";
  const canSubmit = batch.status === "draft" && (batch.items?.length ?? 0) > 0;
  const canConfirm = batch.status === "released";

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    await addItems.mutateAsync({
      batchId,
      items: [{ beneficiaryId: selectedBeneficiary, entitlementAmount: Number(entitlement) }],
    });
    setSelectedBeneficiary("");
    setEntitlement("");
  };

  const handleSubmit = async () => {
    await submitBatch.mutateAsync(batchId);
  };

  const handleConfirm = async (itemId: string) => {
    const url = confirmUrl[itemId];
    if (!url) return;
    setConfirmError((prev) => ({ ...prev, [itemId]: "" }));
    try {
      await confirmDelivery.mutateAsync({ batchId, itemId, deliveryProofUrl: url });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ?? "Failed to confirm delivery";
      setConfirmError((prev) => ({ ...prev, [itemId]: msg }));
    }
  };

  return (
    <div>
      <button
        onClick={onBack}
        style={{
          fontSize: 13,
          color: "var(--color-text-secondary)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          marginBottom: "1rem",
        }}
      >
        ← Back to batches
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>
          {batch.program?.name ?? "Batch"}
        </h1>
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: STATUS_COLOR[batch.status] ?? "var(--color-text-secondary)",
          }}
        >
          {STATUS_LABEL[batch.status] ?? batch.status}
        </span>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Total amount", value: `$${Number(batch.totalAmount).toLocaleString()}` },
          { label: "Beneficiaries", value: batch.beneficiaryCount ?? 0 },
          { label: "Created", value: new Date(batch.createdAt).toLocaleDateString() },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-md)",
              padding: "0.75rem 1rem",
              minWidth: 130,
            }}
          >
            <p style={{ margin: "0 0 2px", fontSize: 11, color: "var(--color-text-tertiary)", textTransform: "uppercase" }}>
              {s.label}
            </p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 500, color: "var(--color-text-primary)" }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Add beneficiary */}
      {canAddItems && (
        <div
          style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-lg)",
            padding: "1.25rem",
            marginBottom: "1.5rem",
            maxWidth: 480,
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 500, margin: "0 0 1rem", color: "var(--color-text-primary)" }}>
            Add beneficiary
          </h2>
          <form onSubmit={handleAddItem} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <select
              value={selectedBeneficiary}
              onChange={(e) => setSelectedBeneficiary(e.target.value)}
              required
              style={{ width: "100%" }}
            >
              <option value="">Select beneficiary…</option>
              {beneficiaries.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.fullName}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Entitlement amount (USD)"
              value={entitlement}
              onChange={(e) => setEntitlement(e.target.value)}
              required
              style={{ width: "100%" }}
            />
            <button
              type="submit"
              disabled={addItems.isPending}
              style={{
                alignSelf: "flex-start",
                padding: "7px 16px",
                fontSize: 13,
                fontWeight: 500,
                background: "var(--color-text-primary)",
                color: "var(--color-background-primary)",
                border: "none",
                borderRadius: "var(--border-radius-md)",
                cursor: "pointer",
                opacity: addItems.isPending ? 0.6 : 1,
              }}
            >
              {addItems.isPending ? "Adding…" : "Add"}
            </button>
          </form>
        </div>
      )}

      {/* Items table */}
      {(batch.items?.length ?? 0) > 0 && (
        <div
          style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-lg)",
            overflow: "hidden",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 120px 120px" + (canConfirm ? " 240px 80px" : ""),
              padding: "0.5rem 1.25rem",
              background: "var(--color-background-secondary)",
              borderBottom: "0.5px solid var(--color-border-tertiary)",
            }}
          >
            {["Beneficiary", "Amount", "Status", ...(canConfirm ? ["Delivery proof URL", ""] : [])].map((h) => (
              <span key={h} style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase" }}>
                {h}
              </span>
            ))}
          </div>
          {batch.items.map((item: any) => (
            <div
              key={item.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 120px 120px" + (canConfirm ? " 240px 80px" : ""),
                padding: "0.75rem 1.25rem",
                borderBottom: "0.5px solid var(--color-border-tertiary)",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>
                {item.beneficiary?.fullName ?? item.beneficiaryId}
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
                ${Number(item.entitlementAmount).toLocaleString()}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: item.status === "confirmed" ? "var(--color-text-success)" : "var(--color-text-secondary)",
                }}
              >
                {item.status}
              </span>
              {canConfirm && item.status !== "confirmed" && (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <input
                      type="url"
                      placeholder="https://proof.example.com/photo.jpg"
                      value={confirmUrl[item.id] ?? ""}
                      onChange={(e) => setConfirmUrl((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      style={{ fontSize: 12, width: "95%" }}
                    />
                    {confirmError[item.id] && (
                      <span style={{ fontSize: 11, color: "var(--color-text-danger)" }}>
                        {confirmError[item.id]}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleConfirm(item.id)}
                    disabled={confirmDelivery.isPending || !confirmUrl[item.id]}
                    style={{
                      padding: "5px 10px",
                      fontSize: 12,
                      fontWeight: 500,
                      background: "var(--color-background-success)",
                      color: "var(--color-text-success)",
                      border: "0.5px solid var(--color-border-success)",
                      borderRadius: "var(--border-radius-md)",
                      cursor: confirmDelivery.isPending || !confirmUrl[item.id] ? "not-allowed" : "pointer",
                      opacity: confirmDelivery.isPending || !confirmUrl[item.id] ? 0.45 : 1,
                    }}
                  >
                    Confirm
                  </button>
                </>
              )}
              {canConfirm && item.status === "confirmed" && (
                <span style={{ fontSize: 12, color: "var(--color-text-success)", gridColumn: "span 2" }}>
                  ✓ Delivered
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Submit button */}
      {canSubmit && (
        <button
          onClick={handleSubmit}
          disabled={submitBatch.isPending}
          style={{
            padding: "9px 20px",
            fontSize: 13,
            fontWeight: 500,
            background: "var(--color-text-primary)",
            color: "var(--color-background-primary)",
            border: "none",
            borderRadius: "var(--border-radius-md)",
            cursor: "pointer",
            opacity: submitBatch.isPending ? 0.6 : 1,
          }}
        >
          {submitBatch.isPending ? "Submitting…" : "Submit for approval"}
        </button>
      )}
      {submitBatch.isSuccess && (
        <p style={{ fontSize: 13, color: "var(--color-text-success)", marginTop: 8 }}>
          Batch submitted — awaiting Controller approval.
        </p>
      )}
    </div>
  );
}

export default function BatchesPage() {
  const [page, setPage] = useState(1);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useBatches({ page });
  const { data: programsData } = usePrograms({ status: "active" });
  const createBatch = useCreateBatch();

  const batches: any[] = data?.data ?? [];
  const total: number = data?.meta?.total ?? 0;
  const programs: any[] = (programsData?.data as any[]) ?? [];

  const [createForm, setCreateForm] = useState({ programId: "", totalAmount: "", notes: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createBatch.mutateAsync({
      programId: createForm.programId,
      totalAmount: Number(createForm.totalAmount),
      ...(createForm.notes ? { notes: createForm.notes } : {}),
    });
    setCreateForm({ programId: "", totalAmount: "", notes: "" });
    setShowCreate(false);
    setSelectedBatchId(result.data?.id ?? null);
  };

  if (selectedBatchId) {
    return <BatchDetail batchId={selectedBatchId} onBack={() => setSelectedBatchId(null)} />;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 2px" }}>
            Distribution batches
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            {isLoading ? "Loading…" : `${total} total`}
          </p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
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
          {showCreate ? "Cancel" : "New batch"}
        </button>
      </div>

      {showCreate && (
        <div
          style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-lg)",
            padding: "1.25rem",
            maxWidth: 480,
            marginBottom: "1.5rem",
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 500, margin: "0 0 1rem", color: "var(--color-text-primary)" }}>
            Create batch
          </h2>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 5 }}>
                Program
              </label>
              <select
                value={createForm.programId}
                onChange={(e) => setCreateForm((f) => ({ ...f, programId: e.target.value }))}
                required
                style={{ width: "100%" }}
              >
                <option value="">Select a program…</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 5 }}>
                Total amount (USD)
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={createForm.totalAmount}
                onChange={(e) => setCreateForm((f) => ({ ...f, totalAmount: e.target.value }))}
                required
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 5 }}>
                Notes (optional)
              </label>
              <textarea
                value={createForm.notes}
                onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                style={{ width: "100%", resize: "vertical", fontSize: 13 }}
              />
            </div>
            <button
              type="submit"
              disabled={createBatch.isPending}
              style={{
                alignSelf: "flex-start",
                padding: "8px 18px",
                fontSize: 13,
                fontWeight: 500,
                background: "var(--color-text-primary)",
                color: "var(--color-background-primary)",
                border: "none",
                borderRadius: "var(--border-radius-md)",
                cursor: "pointer",
                opacity: createBatch.isPending ? 0.6 : 1,
              }}
            >
              {createBatch.isPending ? "Creating…" : "Create batch"}
            </button>
          </form>
        </div>
      )}

      {/* Batches table */}
      <div
        style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-lg)",
          overflow: "hidden",
        }}
      >
        {isLoading ? (
          <p style={{ padding: "1rem 1.25rem", fontSize: 13, color: "var(--color-text-tertiary)" }}>Loading…</p>
        ) : batches.length === 0 ? (
          <p style={{ padding: "1rem 1.25rem", fontSize: 13, color: "var(--color-text-tertiary)" }}>
            No batches yet. Click "New batch" to get started.
          </p>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 120px 160px 120px",
                padding: "0.5rem 1.25rem",
                background: "var(--color-background-secondary)",
                borderBottom: "0.5px solid var(--color-border-tertiary)",
              }}
            >
              {["Program", "Amount", "Status", "Date"].map((h) => (
                <span key={h} style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase" }}>
                  {h}
                </span>
              ))}
            </div>
            {batches.map((b: any) => (
              <div
                key={b.id}
                onClick={() => setSelectedBatchId(b.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 120px 160px 120px",
                  padding: "0.75rem 1.25rem",
                  borderBottom: "0.5px solid var(--color-border-tertiary)",
                  alignItems: "center",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background-secondary)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              >
                <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>
                  {b.program?.name ?? "—"}
                </span>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
                  ${Number(b.totalAmount).toLocaleString()}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: STATUS_COLOR[b.status] ?? "var(--color-text-secondary)",
                  }}
                >
                  {STATUS_LABEL[b.status] ?? b.status}
                </span>
                <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                  {new Date(b.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
            ))}
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
                style={{ fontSize: 12, padding: "5px 12px", cursor: "pointer", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", color: "var(--color-text-secondary)" }}
              >
                Previous
              </button>
              <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                Page {page} of {Math.ceil(total / 20) || 1}
              </span>
              <button
                disabled={page >= Math.ceil(total / 20)}
                onClick={() => setPage((p) => p + 1)}
                style={{ fontSize: 12, padding: "5px 12px", cursor: "pointer", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", color: "var(--color-text-secondary)" }}
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
