// apps/web/src/pages/controller/ControllerDashboard.tsx
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@lib/api-client";
import { useApprovalQueue } from "@hooks/useApprovals";
import { useNavigate } from "react-router-dom";

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div
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
        {label}
      </p>
      <p
        style={{
          margin: "0 0 2px",
          fontSize: 24,
          fontWeight: 500,
          color: "var(--color-text-primary)",
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "var(--color-text-tertiary)",
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

export default function ControllerDashboard() {
  const navigate = useNavigate();
  const { data: summaryData } = useQuery({
    queryKey: ["reports", "summary"],
    queryFn: async () => {
      const { data } = await apiClient.get("/reports/summary");
      return data.data;
    },
    staleTime: 60_000,
  });
  const { data: queueData } = useApprovalQueue({ status: "pending" });
  const s = summaryData ?? {};
  const pendingCount = queueData?.meta?.total ?? 0;

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
        Overview
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "var(--color-text-secondary)",
          marginBottom: "1.5rem",
        }}
      >
        Platform financial summary
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,minmax(0,1fr))",
          gap: 12,
          marginBottom: "2rem",
        }}
      >
        <StatCard
          label="Total contributions"
          value={"$" + Number(s.totalContributions ?? 0).toLocaleString()}
        />
        <StatCard
          label="Total allocated"
          value={"$" + Number(s.totalAllocated ?? 0).toLocaleString()}
        />
        <StatCard
          label="Total distributed"
          value={"$" + Number(s.totalDistributed ?? 0).toLocaleString()}
        />
        <StatCard label="Active programs" value={s.activePrograms ?? 0} />
        <StatCard label="Beneficiaries" value={s.beneficiaryCount ?? 0} />
        <StatCard
          label="Pending approvals"
          value={pendingCount}
          sub={pendingCount > 0 ? "Action required" : "All clear"}
        />
      </div>

      {pendingCount > 0 && (
        <div
          style={{
            background: "var(--color-background-warning)",
            border: "0.5px solid var(--color-border-warning)",
            borderRadius: "var(--border-radius-md)",
            padding: "1rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 2px",
                fontSize: 14,
                fontWeight: 500,
                color: "var(--color-text-warning)",
              }}
            >
              {pendingCount} approval{pendingCount !== 1 ? "s" : ""} awaiting
              your review
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "var(--color-text-secondary)",
              }}
            >
              Funds cannot be released until approvals are resolved
            </p>
          </div>
          <button
            onClick={() => navigate("/controller/approvals")}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              background: "var(--color-text-warning)",
              color: "var(--color-background-primary)",
              border: "none",
              borderRadius: "var(--border-radius-md)",
              cursor: "pointer",
            }}
          >
            Review now
          </button>
        </div>
      )}
    </div>
  );
}
