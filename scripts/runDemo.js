// runDemo.js
// End-to-end BuildLink demo on Base Mainnet — Phase 2 (trustless oracle).
//
// What this script does:
//   1. Deploys EscrowVaultUSDC directly from the admin wallet (NOT via factory)
//      NOTE: Using the factory would set developer = factory address, not admin wallet.
//            Deploying directly sets developer = admin wallet, which is required for
//            depositFunds(), createMilestone(), submitMilestone(), and sendRequest().
//      oracleApprover is set to BuildLinkFunctionsConsumer so it can call approveMilestone directly.
//   2. Approves USDC spend and deposits funds into the vault
//   3. Creates a milestone
//   4. Submits proof hash (simulating contractor submission from admin wallet for demo)
//   5. Calls sendRequest() on BuildLinkFunctionsConsumer
//      → DON fetches /api/procore/webhook → returns "approved"
//      → fulfillRequest() calls approveMilestone() directly on the vault (no listener needed)
//
// Prerequisites:
//   - Admin wallet has USDC on Base Mainnet
//   - Consumer 0x06E96BcAB94443d17b881eb794AFb477556d74A2 is registered on subscription 143
//
// Usage: node scripts/runDemo.js

require("dotenv").config();
const { ethers } = require("ethers");
const { abi: VAULT_USDC_ABI_FULL, bytecode: VAULT_USDC_BYTECODE } =
  require("../artifacts/contracts/EscrowVaultUSDC.sol/EscrowVaultUSDC.json");

// ── Config ────────────────────────────────────────────────────────────────────

const RPC_URL    = process.env.BASE_MAINNET_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!RPC_URL)     throw new Error("Missing BASE_MAINNET_RPC_URL in .env");
if (!PRIVATE_KEY) throw new Error("Missing PRIVATE_KEY in .env");

const USDC_ADDRESS         = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const CONSUMER_ADDRESS     = "0x06E96BcAB94443d17b881eb794AFb477556d74A2";

// Demo values — adjust as needed
const CONTRACTOR_ADDRESS   = "0xFaae61D0a3E4d03Eb6C2f6531Eafc6684a6ef4E2"; // using admin as contractor for demo
const RETAINAGE_BPS        = 500;   // 5%
const PROJECT_NAME         = "BuildLink Demo Project";
const MILESTONE_AMOUNT     = 2_000_000n; // 2 USDC (6 decimals)
const DEPOSIT_AMOUNT       = 3_000_000n; // 3 USDC — covers milestone + retainage
const PROCORE_PROJECT_ID   = "DEMO-001";
// Valid proof hash recognized by the webhook — must be in VALID_HASHES on the server.
// The vault's proofHash is set by submitMilestone(); this string is passed to the oracle
// which forwards it to the webhook for verification.
const DEMO_PROOF_HASH      = "0x" + "a".repeat(64);

// ── ABIs ──────────────────────────────────────────────────────────────────────

const VAULT_ABI = [
  "function depositFunds(uint256 amount) external",
  "function createMilestone(uint256 amount) external returns (uint256 id)",
  "function submitMilestone(uint256 milestoneId, bytes32 proofHash) external",
  "function milestones(uint256) view returns (uint256 amount, uint256 netPayable, uint8 status, bytes32 proofHash, uint64 submittedAt, uint64 approvedAt, uint64 paidAt)",
  "function developer() view returns (address)",
  "function contractor() view returns (address)",
];

const USDC_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

const CONSUMER_ABI = [
  "function sendRequest(address vaultAddress, uint256 milestoneIndex, string procoreProjectId, string proofHash) external returns (bytes32 requestId)",
  "event MilestoneVerified(address indexed vault, uint256 indexed milestoneIndex)",
  "event OracleResponse(bytes32 indexed requestId, bytes response, bytes err)",
  "event ApprovalFailed(address indexed vault, uint256 indexed milestoneIndex)",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
function section(title) {
  console.log("\n──────────────────────────────────────────────");
  console.log(` ${title}`);
  console.log("──────────────────────────────────────────────");
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);

  const network = await provider.getNetwork();
  log(`Network: ${network.name} (chainId ${network.chainId})`);
  log(`Admin wallet: ${wallet.address}`);

  const usdc     = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);
  const consumer = new ethers.Contract(CONSUMER_ADDRESS, CONSUMER_ABI, wallet);

  // ── Step 1: Check USDC balance ────────────────────────────────────────────
  section("Step 1 — USDC Balance Check");
  const balance = await usdc.balanceOf(wallet.address);
  log(`USDC balance: ${ethers.formatUnits(balance, 6)} USDC`);
  if (balance < DEPOSIT_AMOUNT) {
    throw new Error(`Insufficient USDC. Need ${ethers.formatUnits(DEPOSIT_AMOUNT, 6)}, have ${ethers.formatUnits(balance, 6)}`);
  }

  // ── Step 2: Deploy EscrowVaultUSDC directly ──────────────────────────────
  // Deploying directly (not via factory) so that developer = admin wallet.
  // Via factory, developer would be set to the factory contract address,
  // causing onlyDeveloper to revert on all subsequent calls.
  section("Step 2 — Deploy EscrowVaultUSDC directly");
  log(`Deploying EscrowVaultUSDC...`);
  log(`  USDC:       ${USDC_ADDRESS}`);
  log(`  Contractor: ${CONTRACTOR_ADDRESS}`);
  log(`  Retainage:  ${RETAINAGE_BPS / 100}%`);

  const VaultFactory = new ethers.ContractFactory(VAULT_USDC_ABI_FULL, VAULT_USDC_BYTECODE, wallet);
  const vault = await VaultFactory.deploy(USDC_ADDRESS, CONTRACTOR_ADDRESS, RETAINAGE_BPS, 8000, CONSUMER_ADDRESS);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  log(`Vault deployed at: ${vaultAddress}`);
  log(`Developer (admin wallet): ${wallet.address}`);
  log(`oracleApprover: ${CONSUMER_ADDRESS}`);

  // ── Step 3: Approve USDC and deposit into vault ───────────────────────────
  section("Step 3 — Approve USDC and Deposit into Vault");
  log(`Approving ${ethers.formatUnits(DEPOSIT_AMOUNT, 6)} USDC for vault...`);
  const approveTx = await usdc.approve(vaultAddress, DEPOSIT_AMOUNT);
  log(`Approve tx: ${approveTx.hash}`);
  await approveTx.wait();
  log("Approval confirmed.");

  log(`Depositing ${ethers.formatUnits(DEPOSIT_AMOUNT, 6)} USDC into vault...`);
  const depositTx = await vault.depositFunds(DEPOSIT_AMOUNT);
  log(`Deposit tx: ${depositTx.hash}`);
  await depositTx.wait();
  log("Deposit confirmed.");

  // ── Step 4: Create milestone ──────────────────────────────────────────────
  section("Step 4 — Create Milestone");
  log(`Creating milestone: ${ethers.formatUnits(MILESTONE_AMOUNT, 6)} USDC gross`);
  const milestoneTx = await vault.createMilestone(MILESTONE_AMOUNT);
  log(`Tx: ${milestoneTx.hash}`);
  const milestoneReceipt = await milestoneTx.wait();
  log(`Confirmed in block ${milestoneReceipt.blockNumber}`);
  const milestoneIndex = 0n;
  log(`Milestone index: ${milestoneIndex}`);

  // ── Step 5: Submit proof hash ─────────────────────────────────────────────
  // Use DEMO_PROOF_HASH so the on-chain hash matches what we pass to sendRequest.
  // The webhook verifies this hash against VALID_HASHES — it must match to return "approved".
  section("Step 5 — Submit Proof Hash (simulating contractor)");
  log(`Proof hash: ${DEMO_PROOF_HASH}`);
  const submitTx = await vault.submitMilestone(milestoneIndex, DEMO_PROOF_HASH);
  log(`Tx: ${submitTx.hash}`);
  await submitTx.wait();
  log("Proof submitted. Milestone status → SUBMITTED");

  // ── Step 6: Send Chainlink Functions request ──────────────────────────────
  section("Step 6 — Send Chainlink Functions Request");
  log(`Consumer: ${CONSUMER_ADDRESS}`);
  log(`Vault: ${vaultAddress}`);
  log(`Milestone index: ${milestoneIndex}`);
  log(`Procore project ID: ${PROCORE_PROJECT_ID}`);
  log(`Proof hash (sent to oracle): ${DEMO_PROOF_HASH}`);

  const requestTx = await consumer.sendRequest(vaultAddress, milestoneIndex, PROCORE_PROJECT_ID, DEMO_PROOF_HASH);
  log(`Tx submitted: ${requestTx.hash}`);
  const requestReceipt = await requestTx.wait();
  log(`Confirmed in block ${requestReceipt.blockNumber}`);
  log(`Basescan: https://basescan.org/tx/${requestTx.hash}`);

  // ── Done ──────────────────────────────────────────────────────────────────
  section("Done — Waiting for DON fulfillment");
  console.log(`
  Vault address:   ${vaultAddress}
  Milestone index: ${milestoneIndex}
  sendRequest tx:  ${requestTx.hash}

  The Chainlink DON is now executing the JS source:
    → POST /api/procore/webhook
    → Expects { status: "approved" }
    → fulfillRequest() emits MilestoneVerified
    → fulfillRequest() calls approveMilestone() directly on the vault (Phase 2 — no listener needed)

  Watch for fulfillment on Basescan:
  https://basescan.org/address/${CONSUMER_ADDRESS}#events
  `);
}

main().catch((err) => {
  console.error("\nFatal error:", err.message);
  process.exit(1);
});
