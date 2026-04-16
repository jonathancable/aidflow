// apps/web/src/pages/ngo/BeneficiariesPage.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@lib/api-client";

function useBeneficiaries(page: number) {
  return useQuery({
    queryKey: ["beneficiaries", "list", page],
    queryFn: async () => {
      const { data } = await apiClient.get("/beneficiaries", { params: { page, limit: 20 } });
      return data;
    },
  });
}

function useCreateBeneficiary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      fullName: string;
      idNumber?: string;
      contact?: string;
    }) => {
      const { data } = await apiClient.post("/beneficiaries", payload);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["beneficiaries"] }),
  });
}

export default function BeneficiariesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useBeneficiaries(page);
  const createBeneficiary = useCreateBeneficiary();
  const items: any[] = data?.data ?? [];
  const total: number = data?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / 20) || 1;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: "", idNumber: "", contact: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBeneficiary.mutateAsync({
        fullName: form.fullName,
        ...(form.idNumber ? { idNumber: form.idNumber } : {}),
        ...(form.contact ? { contact: form.contact } : {}),
      });
      setForm({ fullName: "", idNumber: "", contact: "" });
      setShowForm(false);
    } catch { /* error shown via isError */ }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1
            style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}
          >
            Beneficiaries
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--color-text-secondary)" }}>
            {total} registered
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            fontSize: 13,
            padding: "7px 16px",
            background: "var(--color-text-primary)",
            color: "var(--color-background-primary)",
            border: "none",
            borderRadius: "var(--border-radius-md)",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          {showForm ? "Cancel" : "Add beneficiary"}
        </button>
      </div>

      {showForm && (
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
          <h2
            style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 1rem" }}
          >
            Register beneficiary
          </h2>
          {createBeneficiary.isError && (
            <div
              style={{
                background: "var(--color-background-danger)",
                border: "0.5px solid var(--color-border-danger)",
                borderRadius: "var(--border-radius-md)",
                padding: "10px 14px",
                marginBottom: 12,
                fontSize: 13,
                color: "var(--color-text-danger)",
              }}
            >
              Failed to register — check inputs and try again.
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>
                Full name *
              </label>
              <input
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                required
                minLength={2}
                style={{ width: "100%", fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>
                ID number
              </label>
              <input
                value={form.idNumber}
                onChange={(e) => setForm((f) => ({ ...f, idNumber: e.target.value }))}
                style={{ width: "100%", fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>
                Contact
              </label>
              <input
                value={form.contact}
                onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                style={{ width: "100%", fontSize: 13 }}
              />
            </div>
            <button
              type="submit"
              disabled={createBeneficiary.isPending}
              style={{
                alignSelf: "flex-start",
                fontSize: 13,
                padding: "7px 20px",
                background: "var(--color-text-primary)",
                color: "var(--color-background-primary)",
                border: "none",
                borderRadius: "var(--border-radius-md)",
                cursor: "pointer",
                fontWeight: 500,
                opacity: createBeneficiary.isPending ? 0.6 : 1,
              }}
            >
              {createBeneficiary.isPending ? "Registering…" : "Register"}
            </button>
          </form>
        </div>
      )}

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
            gridTemplateColumns: "1fr 160px 140px",
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
          <span>Name</span>
          <span>ID number</span>
          <span>Registered</span>
        </div>

        {isLoading ? (
          <p style={{ padding: "1.25rem", fontSize: 13, color: "var(--color-text-tertiary)" }}>
            Loading…
          </p>
        ) : items.length === 0 ? (
          <p style={{ padding: "1.25rem", fontSize: 13, color: "var(--color-text-tertiary)" }}>
            No beneficiaries registered yet.
          </p>
        ) : (
          items.map((b: any) => (
            <div
              key={b.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 160px 140px",
                gap: 8,
                padding: "0.75rem 1.25rem",
                borderBottom: "0.5px solid var(--color-border-tertiary)",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
                {b.fullName}
              </span>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)", fontFamily: "monospace" }}>
                {b.idNumber ?? "—"}
              </span>
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                {new Date(b.createdAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          ))
        )}

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
