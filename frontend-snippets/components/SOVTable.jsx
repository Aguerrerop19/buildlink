// SOVTable.jsx — Schedule of Values table (AIA G703 style).
//
// INTEGRATION:
//   - Import in your project detail page.
//   - Pass `rows` from MOCK_SOV[projectId] (data/mockProjects.js) or live data.
//   - `asset` is "ETH" or "USDC".
//
// Columns: Line Item | Scheduled Value | % Complete | This Period | Prior |
//          Stored Materials | Total Completed | Retainage | Net Payable |
//          Balance to Finish | Status

import { formatAsset } from "../utils/format";

const STATUS_COLOR = {
  "Paid":        { color: "#2e7d32", background: "#e8f5e9" },
  "Pending":     { color: "#f57f17", background: "#fff8e1" },
  "Not Started": { color: "#757575", background: "#f5f5f5" },
  "Disputed":    { color: "#c62828", background: "#fce4ec" },
};

export function SOVTable({ rows, asset = "USDC" }) {
  if (!rows || rows.length === 0) {
    return <p style={{ color: "#9e9e9e", fontSize: "13px" }}>No SOV data available.</p>;
  }

  // Totals
  const totals = rows.reduce(
    (acc, r) => ({
      scheduledValue:          acc.scheduledValue + r.scheduledValue,
      workCompletedThisPeriod: acc.workCompletedThisPeriod + r.workCompletedThisPeriod,
      workCompletedPrior:      acc.workCompletedPrior + r.workCompletedPrior,
      storedMaterials:         acc.storedMaterials + r.storedMaterials,
      totalCompleted:          acc.totalCompleted + r.totalCompleted,
      retainage:               acc.retainage + r.retainage,
      netPayable:              acc.netPayable + r.netPayable,
      balanceToFinish:         acc.balanceToFinish + r.balanceToFinish,
    }),
    {
      scheduledValue: 0n,
      workCompletedThisPeriod: 0n,
      workCompletedPrior: 0n,
      storedMaterials: 0n,
      totalCompleted: 0n,
      retainage: 0n,
      netPayable: 0n,
      balanceToFinish: 0n,
    }
  );

  const totalScheduled = Number(totals.scheduledValue);
  const totalCompleted = Number(totals.totalCompleted);
  const overallPct = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

  const fmt = (v) => formatAsset(v, asset);

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "12px",
          color: "#1a1a1a",
        }}
      >
        <thead>
          <tr style={{ background: "#1a1a2e", color: "#fff" }}>
            <TH>Line Item</TH>
            <TH right>Scheduled Value</TH>
            <TH right>% Complete</TH>
            <TH right>This Period</TH>
            <TH right>Prior</TH>
            <TH right>Materials Stored</TH>
            <TH right>Total Completed</TH>
            <TH right>Retainage</TH>
            <TH right>Net Payable</TH>
            <TH right>Balance to Finish</TH>
            <TH>Status</TH>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const statusStyle = STATUS_COLOR[row.status] || STATUS_COLOR["Not Started"];
            return (
              <tr
                key={i}
                style={{
                  background: i % 2 === 0 ? "#fff" : "#f9f9f9",
                  borderBottom: "1px solid #e0e0e0",
                }}
              >
                <TD bold>{row.lineItem}</TD>
                <TD right>{fmt(row.scheduledValue)}</TD>
                <TD right>
                  <ProgressBar pct={row.percentComplete} />
                </TD>
                <TD right>{fmt(row.workCompletedThisPeriod)}</TD>
                <TD right>{fmt(row.workCompletedPrior)}</TD>
                <TD right>{fmt(row.storedMaterials)}</TD>
                <TD right>{fmt(row.totalCompleted)}</TD>
                <TD right muted>{fmt(row.retainage)}</TD>
                <TD right bold>{fmt(row.netPayable)}</TD>
                <TD right muted>{fmt(row.balanceToFinish)}</TD>
                <TD>
                  <span
                    style={{
                      ...statusStyle,
                      padding: "2px 6px",
                      borderRadius: "9999px",
                      fontSize: "10px",
                      fontWeight: 600,
                    }}
                  >
                    {row.status}
                  </span>
                </TD>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: "#1a1a2e", color: "#fff", fontWeight: 700 }}>
            <td style={tdBase}>TOTALS</td>
            <td style={{ ...tdBase, textAlign: "right" }}>{fmt(totals.scheduledValue)}</td>
            <td style={{ ...tdBase, textAlign: "right" }}>{overallPct}%</td>
            <td style={{ ...tdBase, textAlign: "right" }}>{fmt(totals.workCompletedThisPeriod)}</td>
            <td style={{ ...tdBase, textAlign: "right" }}>{fmt(totals.workCompletedPrior)}</td>
            <td style={{ ...tdBase, textAlign: "right" }}>{fmt(totals.storedMaterials)}</td>
            <td style={{ ...tdBase, textAlign: "right" }}>{fmt(totals.totalCompleted)}</td>
            <td style={{ ...tdBase, textAlign: "right" }}>{fmt(totals.retainage)}</td>
            <td style={{ ...tdBase, textAlign: "right" }}>{fmt(totals.netPayable)}</td>
            <td style={{ ...tdBase, textAlign: "right" }}>{fmt(totals.balanceToFinish)}</td>
            <td style={tdBase} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// Inline progress bar
function ProgressBar({ pct }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end" }}>
      <div
        style={{
          width: "50px",
          height: "5px",
          background: "#e0e0e0",
          borderRadius: "3px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: pct === 100 ? "#2e7d32" : "#1565c0",
            borderRadius: "3px",
          }}
        />
      </div>
      <span style={{ minWidth: "28px", textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

const tdBase = { padding: "8px 10px", whiteSpace: "nowrap" };

function TH({ children, right }) {
  return (
    <th style={{ ...tdBase, textAlign: right ? "right" : "left", fontWeight: 600 }}>
      {children}
    </th>
  );
}

function TD({ children, right, bold, muted }) {
  return (
    <td
      style={{
        ...tdBase,
        textAlign: right ? "right" : "left",
        fontWeight: bold ? 600 : 400,
        color: muted ? "#9e9e9e" : "inherit",
      }}
    >
      {children}
    </td>
  );
}
