// apps/web/src/pages/donor/ProgramsPage.tsx
import { useState } from "react";
import { usePrograms, useProgramFunding } from "@hooks/usePrograms";
import { useCreateContribution } from "@hooks/useContributions";

function FundingBar({ programId }: { programId: string }) {
  const { data: funding } = useProgramFunding(programId);
  if (!funding) return null;
  const pct = Math.min(
    100,
    Math.round((Number(funding.fundedAmount) / Number(funding.budgetTarget)) * 100),
  );
  return (
    <div style={{ marginTop: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "var(--color-text-tertiary)",
          marginBottom: 4,
        }}
      >
        <span>${Number(funding.fundedAmount).toLocaleString()} raised</span>
        <span>{pct}% of ${Number(funding.budgetTarget).toLocaleString()}</span>
      </div>
      <div
        style={{
          height: 4,
          borderRadius: 2,
          background: "var(--color-border-tertiary)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: pct + "%",
            background: "var(--color-text-success)",
            borderRadius: 2,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}

export default function ProgramsPage() {
  const { data, isLoading } = usePrograms({ status: "active" });
  const programs: any[] = data?.data ?? [];
  const [contributing, setContributing] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const createContribution = useCreateContribution();

  const handleContribute = async (e: React.FormEvent, programId: string) => {
    e.preventDefault();
    setSuccess(null);
    try {
      await createContribution.mutateAsync({ programId, amount: Number(amount) });
      setAmount("");
      setContributing(null);
      setSuccess(programId);
      setTimeout(() => setSuccess(null), 3000);
    } catch { /* error shown via isError */ }
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
        Active programs
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "var(--color-text-secondary)",
          marginBottom: "1.5rem",
        }}
      >
        Browse and contribute to programs
      </p>

      {isLoading ? (
        <p style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Loading…</p>
      ) : programs.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>No active programs.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {programs.map((p: any) => (
            <div
              key={p.id}
              style={{
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-lg)",
                padding: "1.25rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 4,
                }}
              >
                <div>
                  <p
                    style={{
                      margin: "0 0 2px",
                      fontSize: 15,
                      fontWeight: 500,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {p.name}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-tertiary)" }}>
                    {p.type}
                    {p.region ? " · " + p.region : ""}
                  </p>
                </div>
                {success === p.id ? (
                  <span
                    style={{ fontSize: 12, color: "var(--color-text-success)", fontWeight: 500 }}
                  >
                    Contributed ✓
                  </span>
                ) : contributing === p.id ? (
                  <form
                    onSubmit={(e) => handleContribute(e, p.id)}
                    style={{ display: "flex", gap: 6, alignItems: "center" }}
                  >
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="Amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      autoFocus
                      style={{ width: 100, fontSize: 13 }}
                    />
                    <button
                      type="submit"
                      disabled={createContribution.isPending}
                      style={{
                        fontSize: 12,
                        padding: "5px 12px",
                        background: "var(--color-text-primary)",
                        color: "var(--color-background-primary)",
                        border: "none",
                        borderRadius: "var(--border-radius-md)",
                        cursor: "pointer",
                        opacity: createContribution.isPending ? 0.6 : 1,
                      }}
                    >
                      {createContribution.isPending ? "…" : "Confirm"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setContributing(null); setAmount(""); }}
                      style={{
                        fontSize: 12,
                        padding: "5px 10px",
                        background: "none",
                        border: "0.5px solid var(--color-border-secondary)",
                        borderRadius: "var(--border-radius-md)",
                        cursor: "pointer",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => { setContributing(p.id); setAmount(""); }}
                    style={{
                      fontSize: 12,
                      padding: "6px 14px",
                      background: "var(--color-text-primary)",
                      color: "var(--color-background-primary)",
                      border: "none",
                      borderRadius: "var(--border-radius-md)",
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                  >
                    Contribute
                  </button>
                )}
              </div>

              <FundingBar programId={p.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
