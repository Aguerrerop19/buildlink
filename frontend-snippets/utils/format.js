// format.js — Formatting utilities for ETH and USDC amounts

// USDC has 6 decimals on Base
const USDC_DECIMALS = 6n;
const USDC_UNIT = 10n ** USDC_DECIMALS; // 1_000_000n

// ETH has 18 decimals
const ETH_DECIMALS = 18n;
const ETH_UNIT = 10n ** ETH_DECIMALS;

/**
 * Format a raw USDC amount (BigInt, 6 decimals) as "$X,XXX.XX"
 * @param {bigint|string|number} raw  Raw on-chain value (e.g. 50000000000n = $50,000)
 * @returns {string}  e.g. "$50,000.00"
 */
export function formatUSDC(raw) {
  const value = BigInt(raw);
  const dollars = value / USDC_UNIT;
  const cents = value % USDC_UNIT;
  // Pad cents to 6 digits then take first 2 for display
  const centsStr = cents.toString().padStart(6, "0").slice(0, 2);
  return `$${Number(dollars).toLocaleString("en-US")}.${centsStr}`;
}

/**
 * Parse a human-readable dollar amount to raw USDC units (BigInt)
 * @param {string|number} dollars  e.g. 50000 or "50000.00"
 * @returns {bigint}  e.g. 50000000000n
 */
export function parseUSDC(dollars) {
  const [whole, frac = ""] = String(dollars).split(".");
  const fracPadded = frac.padEnd(6, "0").slice(0, 6);
  return BigInt(whole) * USDC_UNIT + BigInt(fracPadded);
}

/**
 * Format a raw ETH amount (BigInt, 18 decimals) as "X.XXXX ETH"
 * @param {bigint|string|number} raw  Raw wei value
 * @returns {string}  e.g. "0.5000 ETH"
 */
export function formatETH(raw) {
  const value = BigInt(raw);
  const whole = value / ETH_UNIT;
  const frac = value % ETH_UNIT;
  const fracStr = frac.toString().padStart(18, "0").slice(0, 4);
  return `${whole}.${fracStr} ETH`;
}

/**
 * Format retainage basis points as a percentage string
 * @param {number|bigint} bps  e.g. 500
 * @returns {string}  e.g. "5%"
 */
export function formatRetainage(bps) {
  return `${Number(bps) / 100}%`;
}

/**
 * Format a unix timestamp (seconds) as a locale date string
 * @param {number|bigint} ts  Unix timestamp in seconds
 * @returns {string}  e.g. "Mar 31, 2026"
 */
export function formatDate(ts) {
  if (!ts || ts === 0n || ts === 0) return "—";
  return new Date(Number(ts) * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format an asset amount based on asset type
 * @param {bigint|string|number} raw  Raw on-chain amount
 * @param {"ETH"|"USDC"} asset
 * @returns {string}
 */
export function formatAsset(raw, asset) {
  return asset === "USDC" ? formatUSDC(raw) : formatETH(raw);
}
