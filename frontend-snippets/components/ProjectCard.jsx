// ProjectCard.jsx — Extended project card with ETH/USDC support, status, last draw.
//
// INTEGRATION:
//   1. Import this component wherever your current project list renders cards.
//   2. Pass a project object matching the shape in data/mockProjects.js.
//   3. For live data, replace props with values from useEscrowUSDC / useEscrowETH hooks.
//
// Dependencies: React, AssetBadge, format utils

import { AssetBadge } from "./AssetBadge";
import { formatAsset, formatRetainage, formatDate } from "../utils/format";

// Map project status to a display color
const STATUS_STYLE = {
  "Funded":      { background: "#e8f5e9", color: "#2e7d32" },
  "In Progress": { background: "#fff8e1", color: "#f57f17" },
  "Pending":     { background: "#fce4ec", color: "#c62828" },
  "Complete":    { background: "#e3f2fd", color: "#1565c0" },
};

function StatusBadge({ status }) {
  const style = STATUS_STYLE[status] || { background: "#f5f5f5", color: "#616161" };
  return (
    <span
      style={{
        ...style,
        padding: "2px 8px",
        borderRadius: "9999px",
        fontSize: "11px",
        fontWeight: 600,
      }}
    >
      {status}
    </span>
  );
}

export function ProjectCard({ project, onSelect }) {
  const {
    name,
    address: projectAddress,
    developer,
    developerName,
    contractor,
    contractorName,
    asset,
    contractValue,
    retainageBps,
    status,
    totalDeposited,
    totalPaid,
    retainageHeld,
    lastDraw,
  } = project;

  const funded = formatAsset(totalDeposited, asset);
  const paid = formatAsset(totalPaid, asset);
  const retainage = formatAsset(retainageHeld, asset);
  const retainagePct = formatRetainage(retainageBps);
  const lastDrawDisplay = lastDraw
    ? new Date(lastDraw).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Pending";

  return (
    <div
      onClick={() => onSelect?.(project)}
      style={{
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        padding: "20px",
        background: "#fff",
        cursor: onSelect ? "pointer" : "default",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)")}
    >
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#1a1a1a" }}>{name}</h3>
        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0, marginLeft: "12px" }}>
          <AssetBadge asset={asset} />
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Address */}
      <p style={{ margin: "0 0 12px", fontSize: "12px", color: "#757575" }}>{projectAddress}</p>

      {/* Parties */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
        <div>
          <div style={{ fontSize: "10px", color: "#9e9e9e", textTransform: "uppercase", letterSpacing: "0.06em" }}>Developer</div>
          <div style={{ fontSize: "13px", fontWeight: 500 }}>{developerName}</div>
          <div style={{ fontSize: "11px", color: "#9e9e9e", fontFamily: "monospace" }}>
            {developer.slice(0, 6)}…{developer.slice(-4)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: "10px", color: "#9e9e9e", textTransform: "uppercase", letterSpacing: "0.06em" }}>Contractor</div>
          <div style={{ fontSize: "13px", fontWeight: 500 }}>{contractorName}</div>
          <div style={{ fontSize: "11px", color: "#9e9e9e", fontFamily: "monospace" }}>
            {contractor.slice(0, 6)}…{contractor.slice(-4)}
          </div>
        </div>
      </div>

      {/* Financial summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
          padding: "12px",
          background: "#f9f9f9",
          borderRadius: "6px",
          marginBottom: "14px",
        }}
      >
        <Stat label="Escrowed" value={funded} />
        <Stat label="Paid to Date" value={paid} />
        <Stat label="Retainage Held" value={retainage} sub={`(${retainagePct})`} />
      </div>

      {/* Footer row */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#757575" }}>
        <span>
          Contract value: <strong style={{ color: "#1a1a1a" }}>{formatAsset(contractValue, asset)}</strong>
        </span>
        <span>
          Last draw: <strong style={{ color: "#1a1a1a" }}>{lastDrawDisplay}</strong>
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div>
      <div style={{ fontSize: "10px", color: "#9e9e9e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>
        {label}
      </div>
      <div style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a" }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: "#9e9e9e" }}>{sub}</div>}
    </div>
  );
}
