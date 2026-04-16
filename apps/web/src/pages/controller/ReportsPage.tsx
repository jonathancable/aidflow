// apps/web/src/pages/controller/ReportsPage.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@lib/api-client";
import { STALE } from "@lib/query-client";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 15,
        fontWeight: 500,
        color: "var(--color-text-primary)",
        margin: "0 0 1rem",
      }}
    >
      {children}
    </h2>
  );
}

function useAuditLog(params: {
  entityType?: string;
  actorId?: string;
  from?: string;
  to?: string;
  page: number;
}) {
  return useQuery({
    queryKey: ["reports", "audit", params],
    queryFn: async () => {
      const { data } = await apiClient.get("/reports/audit", {
        params: Object.fromEntries(
          Object.entries(params).filter(([, v]) => v !== "" && v !== undefined),
        ),
      });
      return data;
    },
    staleTime: STALE.AUDIT,
  });
}

export default function ReportsPage() {
  // Audit log filters
  const [entityType, setEntityType] = useState("");
  const [actorId, setActorId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [auditPage, setAuditPage] = useState(1);

  // CSV export state
  const [exportType, setExportType] = useState("distribution");
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const { data: auditData, isLoading: auditLoading } = useAuditLog({
    entityType,
    actorId,
    from,
    to,
    page: auditPage,
  });
  const auditEntries: any[] = auditData?.data ?? [];
  const auditTotal: number = auditData?.meta?.total ?? 0;
  const auditPages = Math.ceil(auditTotal / 50) || 1;

  const handleExport = async () => {
    if (!exportFrom || !exportTo) return;
    setExporting(true);
    try {
      const resp = await apiClient.get("/reports/export", {
        params: { type: exportType, from: exportFrom, to: exportTo },
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([resp.data], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `aidflow-${exportType}-${exportFrom}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <h1
        style={{
          fontSize: 22,
          fontWeight: 500,
          color: "var(--color-text-primary)",
          marginBottom: "1.75rem",
        }}
      >
        Reports
      </h1>

      {/* CSV Export */}
      <div
        style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-lg)",
          padding: "1.25rem",
          marginBottom: "1.75rem",
        }}
      >
        <SectionTitle>Export CSV</SectionTitle>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>
              Report type
            </label>
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value)}
              style={{ fontSize: 13 }}
            >
              <option value="distribution">Distribution</option>
              <option value="audit">Audit log</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>
              From
            </label>
            <input
              type="date"
              value={exportFrom}
              onChange={(e) => setExportFrom(e.target.value)}
              style={{ fontSize: 13 }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>
              To
            </label>
            <input
              type="date"
              value={exportTo}
              onChange={(e) => setExportTo(e.target.value)}
              style={{ fontSize: 13 }}
            />
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || !exportFrom || !exportTo}
            style={{
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: 500,
              background: "var(--color-text-primary)",
              color: "var(--color-background-primary)",
              border: "none",
              borderRadius: "var(--border-radius-md)",
              cursor: exporting || !exportFrom || !exportTo ? "default" : "pointer",
              opacity: exporting || !exportFrom || !exportTo ? 0.5 : 1,
            }}
          >
            {exporting ? "Exporting…" : "Download CSV"}
          </button>
        </div>
      </div>

      {/* Audit log */}
      <div
        style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-lg)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "1.25rem 1.25rem 1rem", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
          <SectionTitle>Audit log</SectionTitle>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              placeholder="Entity type (e.g. user)"
              value={entityType}
              onChange={(e) => { setEntityType(e.target.value); setAuditPage(1); }}
              style={{ fontSize: 12, padding: "5px 10px", width: 160 }}
            />
            <input
              placeholder="Actor ID"
              value={actorId}
              onChange={(e) => { setActorId(e.target.value); setAuditPage(1); }}
              style={{ fontSize: 12, padding: "5px 10px", width: 220 }}
            />
            <input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setAuditPage(1); }}
              style={{ fontSize: 12 }}
            />
            <input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setAuditPage(1); }}
              style={{ fontSize: 12 }}
            />
          </div>
        </div>

        {/* Column headers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "160px 140px 1fr 160px",
            gap: 8,
            padding: "0.6rem 1.25rem",
            borderBottom: "0.5px solid var(--color-border-tertiary)",
            fontSize: 11,
            color: "var(--color-text-tertiary)",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          <span>Action</span>
          <span>Entity type</span>
          <span>Actor</span>
          <span>Date</span>
        </div>

        {auditLoading ? (
          <p style={{ padding: "1.25rem", fontSize: 13, color: "var(--color-text-tertiary)" }}>
            Loading…
          </p>
        ) : auditEntries.length === 0 ? (
          <p style={{ padding: "1.25rem", fontSize: 13, color: "var(--color-text-tertiary)" }}>
            No audit entries found.
          </p>
        ) : (
          auditEntries.map((e: any) => (
            <div
              key={e.id}
              style={{
                display: "grid",
                gridTemplateColumns: "160px 140px 1fr 160px",
                gap: 8,
                padding: "0.65rem 1.25rem",
                borderBottom: "0.5px solid var(--color-border-tertiary)",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--color-text-primary)",
                  fontFamily: "monospace",
                }}
              >
                {e.action}
              </span>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                {e.entityType}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--color-text-tertiary)",
                  fontFamily: "monospace",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {e.actorId}
              </span>
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                {new Date(e.createdAt).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))
        )}

        {!auditLoading && auditEntries.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.75rem 1.25rem",
            }}
          >
            <button
              disabled={auditPage <= 1}
              onClick={() => setAuditPage((p) => p - 1)}
              style={{
                fontSize: 12,
                padding: "5px 12px",
                cursor: auditPage <= 1 ? "default" : "pointer",
                background: "var(--color-background-secondary)",
                border: "0.5px solid var(--color-border-secondary)",
                borderRadius: "var(--border-radius-md)",
                color: "var(--color-text-secondary)",
                opacity: auditPage <= 1 ? 0.4 : 1,
              }}
            >
              Previous
            </button>
            <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
              {auditTotal} entries · Page {auditPage} of {auditPages}
            </span>
            <button
              disabled={auditPage >= auditPages}
              onClick={() => setAuditPage((p) => p + 1)}
              style={{
                fontSize: 12,
                padding: "5px 12px",
                cursor: auditPage >= auditPages ? "default" : "pointer",
                background: "var(--color-background-secondary)",
                border: "0.5px solid var(--color-border-secondary)",
                borderRadius: "var(--border-radius-md)",
                color: "var(--color-text-secondary)",
                opacity: auditPage >= auditPages ? 0.4 : 1,
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
