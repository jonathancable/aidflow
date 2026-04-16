// apps/web/src/pages/ngo/ProgramsPage.tsx
import { useState } from "react";
import { usePrograms, useCreateProgram } from "@hooks/usePrograms";

export default function NGOProgramsPage() {
  const { data, isLoading } = usePrograms({});
  const createProgram = useCreateProgram();
  const programs: any[] = data?.data ?? [];

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "", budgetTarget: "", region: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProgram.mutateAsync({
        name: form.name,
        type: form.type,
        budgetTarget: Number(form.budgetTarget),
        ...(form.region ? { region: form.region } : {}),
      });
      setForm({ name: "", type: "", budgetTarget: "", region: "" });
      setShowForm(false);
    } catch { /* error shown via isError */ }
  };

  const STATUS_COLOR: Record<string, string> = {
    active:    "var(--color-text-success)",
    paused:    "var(--color-text-warning)",
    completed: "var(--color-text-secondary)",
    cancelled: "var(--color-text-danger)",
    draft:     "var(--color-text-tertiary)",
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
            Programs
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--color-text-secondary)" }}>
            {programs.length} program{programs.length !== 1 ? "s" : ""} in your organisation
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
          {showForm ? "Cancel" : "New program"}
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
          }}
        >
          <h2
            style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 1rem" }}
          >
            Create program
          </h2>
          {createProgram.isError && (
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
              Failed to create program — check inputs and try again.
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>
                Name *
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                minLength={3}
                style={{ width: "100%", fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>
                Type *
              </label>
              <input
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                placeholder="e.g. feeding, healthcare"
                required
                style={{ width: "100%", fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>
                Budget target (USD) *
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={form.budgetTarget}
                onChange={(e) => setForm((f) => ({ ...f, budgetTarget: e.target.value }))}
                required
                style={{ width: "100%", fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>
                Region
              </label>
              <input
                value={form.region}
                onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                placeholder="e.g. West Africa"
                style={{ width: "100%", fontSize: 13 }}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <button
                type="submit"
                disabled={createProgram.isPending}
                style={{
                  fontSize: 13,
                  padding: "7px 20px",
                  background: "var(--color-text-primary)",
                  color: "var(--color-background-primary)",
                  border: "none",
                  borderRadius: "var(--border-radius-md)",
                  cursor: "pointer",
                  fontWeight: 500,
                  opacity: createProgram.isPending ? 0.6 : 1,
                }}
              >
                {createProgram.isPending ? "Creating…" : "Create program"}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <p style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Loading…</p>
      ) : programs.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>No programs yet. Create your first one.</p>
      ) : (
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
              gridTemplateColumns: "1fr 100px 120px 100px",
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
            <span>Type</span>
            <span>Budget</span>
            <span>Status</span>
          </div>
          {programs.map((p: any) => (
            <div
              key={p.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 100px 120px 100px",
                gap: 8,
                padding: "0.75rem 1.25rem",
                borderBottom: "0.5px solid var(--color-border-tertiary)",
                alignItems: "center",
              }}
            >
              <div>
                <p style={{ margin: "0 0 1px", fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
                  {p.name}
                </p>
                {p.region && (
                  <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-tertiary)" }}>{p.region}</p>
                )}
              </div>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{p.type}</span>
              <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>
                ${Number(p.budgetTarget).toLocaleString()}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: STATUS_COLOR[p.status] ?? "var(--color-text-secondary)",
                  textTransform: "capitalize",
                }}
              >
                {p.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
