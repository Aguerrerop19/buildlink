// MilestoneActions.jsx — Action buttons for milestone lifecycle.
//
// INTEGRATION:
//   - Import in your milestone detail view or SOV table row.
//   - Pass `onAction` to wire each button to the useEscrowUSDC / useEscrowETH hooks.
//   - `role` should be "developer" or "contractor" — controls which buttons appear.
//   - `status` is the numeric MilestoneStatus from the contract (0–4).
//   - `isPending` disables all buttons while a tx is in-flight.
//
// Button visibility matrix:
//   NONE (0):      contractor → Submit
//   SUBMITTED (1): developer  → Approve | Dispute
//   APPROVED (2):  developer  → Release Payment
//   DISPUTED (4):  contractor → Re-submit
//   PAID (3):      none

const STATUS_LABELS = {
  0: "Not Started",
  1: "Submitted",
  2: "Approved",
  3: "Paid",
  4: "Disputed",
};

const STATUS_COLOR = {
  0: "#757575",
  1: "#f57f17",
  2: "#1565c0",
  3: "#2e7d32",
  4: "#c62828",
};

export function MilestoneActions({
  milestoneId,
  status,
  role,           // "developer" | "contractor"
  isPending,
  onDeposit,      // developer only — called before first milestone
  onSubmit,       // contractor
  onApprove,      // developer
  onRelease,      // developer (payMilestone)
  onDispute,      // developer
  onReleaseRetainage, // developer — show only when all milestones paid
  showRetainageButton = false,
}) {
  const disabled = isPending;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Status indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: STATUS_COLOR[status] ?? "#9e9e9e",
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: "13px", fontWeight: 500, color: STATUS_COLOR[status] ?? "#9e9e9e" }}>
          {STATUS_LABELS[status] ?? "Unknown"}
        </span>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {/* DEVELOPER: Deposit Funds (before any milestones start) */}
        {role === "developer" && onDeposit && (
          <ActionButton
            label="Deposit Funds"
            variant="secondary"
            disabled={disabled}
            onClick={() => onDeposit(milestoneId)}
          />
        )}

        {/* CONTRACTOR: Submit milestone (status NONE or DISPUTED) */}
        {role === "contractor" && (status === 0 || status === 4) && (
          <ActionButton
            label={status === 4 ? "Re-submit Milestone" : "Submit Milestone"}
            variant="primary"
            disabled={disabled}
            onClick={() => onSubmit?.(milestoneId)}
          />
        )}

        {/* DEVELOPER: Approve (status SUBMITTED) */}
        {role === "developer" && status === 1 && (
          <ActionButton
            label="Approve Milestone"
            variant="primary"
            disabled={disabled}
            onClick={() => onApprove?.(milestoneId)}
          />
        )}

        {/* DEVELOPER: Release Payment (status APPROVED) */}
        {role === "developer" && status === 2 && (
          <ActionButton
            label="Release Payment"
            variant="success"
            disabled={disabled}
            onClick={() => onRelease?.(milestoneId)}
          />
        )}

        {/* DEVELOPER: Dispute (status SUBMITTED or APPROVED) */}
        {role === "developer" && (status === 1 || status === 2) && (
          <ActionButton
            label="Dispute"
            variant="danger"
            disabled={disabled}
            onClick={() => onDispute?.(milestoneId)}
          />
        )}
      </div>

      {/* Release Retainage — shown at project level when all milestones are PAID */}
      {role === "developer" && showRetainageButton && (
        <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: "12px", marginTop: "4px" }}>
          <ActionButton
            label="Release Retainage"
            variant="success"
            disabled={disabled}
            onClick={() => onReleaseRetainage?.()}
            fullWidth
          />
          <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#9e9e9e" }}>
            All milestones are paid. Retainage can now be released to the contractor.
          </p>
        </div>
      )}

      {/* Pending indicator */}
      {isPending && (
        <p style={{ margin: 0, fontSize: "12px", color: "#9e9e9e", fontStyle: "italic" }}>
          Transaction pending…
        </p>
      )}
    </div>
  );
}

function ActionButton({ label, variant = "primary", disabled, onClick, fullWidth }) {
  const STYLES = {
    primary: { background: "#1565c0", color: "#fff", border: "none" },
    secondary: { background: "#fff", color: "#1565c0", border: "1px solid #1565c0" },
    success: { background: "#2e7d32", color: "#fff", border: "none" },
    danger: { background: "#fff", color: "#c62828", border: "1px solid #c62828" },
  };

  const base = STYLES[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...base,
        padding: "8px 16px",
        borderRadius: "6px",
        fontSize: "13px",
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        width: fullWidth ? "100%" : undefined,
        transition: "opacity 0.15s",
      }}
    >
      {label}
    </button>
  );
}
