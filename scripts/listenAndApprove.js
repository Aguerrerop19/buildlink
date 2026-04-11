// listenAndApprove.js
// Listens for MilestoneVerified events from BuildLinkFunctionsConsumer on Base Mainnet.
// When detected, calls approveMilestone() on the target EscrowVaultUSDC from the admin wallet.
//
// Usage: node scripts/listenAndApprove.js

require("dotenv").config();
const { ethers } = require("ethers");

// ── Config ────────────────────────────────────────────────────────────────────

const RPC_URL    = process.env.BASE_MAINNET_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const CONSUMER_ADDRESS = "0x06E96BcAB94443d17b881eb794AFb477556d74A2";

if (!RPC_URL)     throw new Error("Missing BASE_MAINNET_RPC_URL in .env");
if (!PRIVATE_KEY) throw new Error("Missing PRIVATE_KEY in .env");

// ── ABIs ──────────────────────────────────────────────────────────────────────

const CONSUMER_ABI = [
  "event MilestoneVerified(address indexed vault, uint256 indexed milestoneIndex)",
];

const VAULT_ABI = [
  "function approveMilestone(uint256 milestoneId) external",
];

// ── Setup ─────────────────────────────────────────────────────────────────────

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);
const consumer = new ethers.Contract(CONSUMER_ADDRESS, CONSUMER_ABI, provider);

// ── Listener ──────────────────────────────────────────────────────────────────

async function handleMilestoneVerified(vault, milestoneIndex, event) {
  console.log("──────────────────────────────────────────────");
  console.log(`MilestoneVerified detected`);
  console.log(`  vault:          ${vault}`);
  console.log(`  milestoneIndex: ${milestoneIndex.toString()}`);
  console.log(`  block:          ${event.log.blockNumber}`);
  console.log(`  txHash:         ${event.log.transactionHash}`);

  try {
    const vaultContract = new ethers.Contract(vault, VAULT_ABI, wallet);

    console.log(`  → Calling approveMilestone(${milestoneIndex}) on vault...`);
    const tx = await vaultContract.approveMilestone(milestoneIndex);
    console.log(`  → Submitted. txHash: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`  → Confirmed in block ${receipt.blockNumber}`);
  } catch (err) {
    console.error(`  ✗ approveMilestone failed: ${err.message}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const network = await provider.getNetwork();
  const adminAddress = wallet.address;

  console.log("BuildLink — MilestoneVerified Listener");
  console.log("──────────────────────────────────────────────");
  console.log(`Network:  ${network.name} (chainId ${network.chainId})`);
  console.log(`Consumer: ${CONSUMER_ADDRESS}`);
  console.log(`Admin:    ${adminAddress}`);
  console.log("──────────────────────────────────────────────");
  console.log("Listening for MilestoneVerified events...\n");

  consumer.on("MilestoneVerified", handleMilestoneVerified);

  // Keep the process alive
  process.stdin.resume();

  process.on("SIGINT", () => {
    console.log("\nShutting down listener.");
    consumer.removeAllListeners();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
