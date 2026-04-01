// AssetBadge.jsx — Small pill badge indicating ETH or USDC asset type
// Drop-in component, no dependencies beyond React and your existing CSS/Tailwind.

export function AssetBadge({ asset }) {
  const isUSDC = asset === "USDC";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 8px",
        borderRadius: "9999px",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.04em",
        background: isUSDC ? "#e8f5e9" : "#e3f2fd",
        color: isUSDC ? "#2e7d32" : "#1565c0",
        border: isUSDC ? "1px solid #a5d6a7" : "1px solid #90caf9",
      }}
    >
      {isUSDC ? (
        <>
          <span>$</span> USDC
        </>
      ) : (
        <>
          <span>◆</span> ETH
        </>
      )}
    </span>
  );
}
