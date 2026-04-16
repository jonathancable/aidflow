// apps/web/src/pages/donor/WalletPage.tsx
import { useAuthStore } from "@stores/auth.store";
import { useWalletBalance, useWalletTransactions } from "@hooks/useWallet";
import { useState } from "react";

export default function WalletPage() {
  const user = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const { data: wallet, isLoading: balLoading } = useWalletBalance(
    user?.walletId ?? null,
  );
  const { data: txData, isLoading: txLoading } = useWalletTransactions(
    user?.walletId ?? null,
    { page },
  );
  const txs: any[] = txData?.data ?? [];

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
        My wallet
      </h1>

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
            label: "Total balance",
            value: balLoading
              ? "..."
              : "$" + Number(wallet?.balance ?? 0).toLocaleString(),
          },
          {
            label: "Reserved",
            value: balLoading
              ? "..."
              : "$" + Number(wallet?.reservedAmount ?? 0).toLocaleString(),
          },
          {
            label: "Available",
            value: balLoading
              ? "..."
              : "$" + Number(wallet?.available ?? 0).toLocaleString(),
          },
        ].map((c) => (
          <div
            key={c.label}
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
              {c.label}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 500,
                color: "var(--color-text-primary)",
              }}
            >
              {c.value}
            </p>
          </div>
        ))}
      </div>

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
            Transaction history
          </p>
        </div>
        {txLoading ? (
          <p
            style={{
              padding: "1rem 1.25rem",
              fontSize: 13,
              color: "var(--color-text-tertiary)",
            }}
          >
            Loading...
          </p>
        ) : txs.length === 0 ? (
          <p
            style={{
              padding: "1rem 1.25rem",
              fontSize: 13,
              color: "var(--color-text-tertiary)",
            }}
          >
            No transactions yet.
          </p>
        ) : (
          <div>
            {txs.map((tx: any) => (
              <div
                key={tx.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1.25rem",
                  borderBottom: "0.5px solid var(--color-border-tertiary)",
                }}
              >
                <div>
                  <p
                    style={{
                      margin: "0 0 2px",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--color-text-primary)",
                      textTransform: "capitalize",
                    }}
                  >
                    {tx.referenceType?.replace(/_/g, " ")}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: "var(--color-text-tertiary)",
                    }}
                  >
                    {new Date(tx.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    fontWeight: 500,
                    color:
                      tx.creditWalletId === user?.walletId
                        ? "var(--color-text-success)"
                        : "var(--color-text-danger)",
                  }}
                >
                  {(tx.creditWalletId === user?.walletId ? "+" : "-") +
                    "$" +
                    Number(tx.amount).toLocaleString()}
                </p>
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
                Page {page} of {Math.ceil((txData?.meta?.total ?? 0) / 20) || 1}
              </span>
              <button
                disabled={page >= Math.ceil((txData?.meta?.total ?? 0) / 20)}
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
          </div>
        )}
      </div>
    </div>
  );
}
