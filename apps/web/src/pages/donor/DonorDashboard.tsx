// apps/web/src/pages/donor/DonorDashboard.tsx
import { useState } from "react";
import { useAuthStore } from "@stores/auth.store";
import { useWalletBalance } from "@hooks/useWallet";
import { usePrograms } from "@hooks/usePrograms";
import { useCreateContribution } from "@hooks/useContributions";

export default function DonorDashboard() {
  const user = useAuthStore((s) => s.user);
  const { data: wallet, isLoading: walletLoading } = useWalletBalance(
    user?.walletId ?? null,
  );
  const { data: programsData } = usePrograms({ status: "active" });
  const createContribution = useCreateContribution();

  const [form, setForm] = useState({ programId: "", amount: "" });
  const [success, setSuccess] = useState(false);

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    try {
      await createContribution.mutateAsync({
        programId: form.programId,
        amount: Number(form.amount),
      });
      setForm({ programId: "", amount: "" });
      setSuccess(true);
    } catch { /* error displayed via createContribution.isError */ }
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
        Welcome, {user?.name?.split(" ")[0]}
      </h1>

      {/* Wallet balance card */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,minmax(0,1fr))",
          gap: 12,
          marginBottom: "2rem",
        }}
      >
        {[
          {
            label: "Wallet balance",
            value: walletLoading
              ? "..."
              : "$" + Number(wallet?.balance ?? 0).toLocaleString(),
          },
          {
            label: "Reserved",
            value: walletLoading
              ? "..."
              : "$" + Number(wallet?.reserved ?? 0).toLocaleString(),
          },
          {
            label: "Available",
            value: walletLoading
              ? "..."
              : "$" + Number(wallet?.available ?? 0).toLocaleString(),
          },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              background: "var(--color-background-secondary)",
              borderRadius: "var(--border-radius-md)",
              padding: "1rem",
            }}
          >
            <p
              style={{
                margin: "0 0 4px",
                fontSize: 13,
                color: "var(--color-text-secondary)",
              }}
            >
              {card.label}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 500,
                color: "var(--color-text-primary)",
              }}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Contribute form */}
      <div
        style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-lg)",
          padding: "1.25rem",
          maxWidth: 480,
        }}
      >
        <h2
          style={{
            fontSize: 16,
            fontWeight: 500,
            margin: "0 0 1rem",
            color: "var(--color-text-primary)",
          }}
        >
          Make a contribution
        </h2>

        {success && (
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
            Contribution confirmed — thank you!
          </div>
        )}

        {createContribution.isError && (
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
            {(createContribution.error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
              ?.message ?? "Contribution failed"}
          </div>
        )}

        <form onSubmit={handleContribute}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                color: "var(--color-text-secondary)",
                marginBottom: 6,
              }}
            >
              Program
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
              {(programsData?.data as { id: string; name: string }[] | undefined)?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                color: "var(--color-text-secondary)",
                marginBottom: 6,
              }}
            >
              Amount (USD)
            </label>
            <input
              type="number"
              min="1"
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
          <button
            type="submit"
            disabled={createContribution.isPending}
            style={{
              background: "var(--color-text-primary)",
              color: "var(--color-background-primary)",
              border: "none",
              borderRadius: "var(--border-radius-md)",
              padding: "9px 20px",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              opacity: createContribution.isPending ? 0.6 : 1,
            }}
          >
            {createContribution.isPending ? "Processing…" : "Contribute"}
          </button>
        </form>
      </div>
    </div>
  );
}
