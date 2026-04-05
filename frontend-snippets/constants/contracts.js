// contracts.js — BuildLink contract addresses and minimal ABIs
// Replace FACTORY_ETH_ADDRESS and FACTORY_USDC_ADDRESS with your deployed addresses.

export const ADDRESSES = {
  base: {
    FACTORY_ETH:        "0x5Ead178647b041B47A8598d97524d94495b95E57",
    FACTORY_USDC:       "0x52Fe0996920104B45ad8e3183A48df4a62668BC0",
    USDC:               "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    FUNCTIONS_CONSUMER: "0x184441c67224b5a395Ab60F025E4a06E8cfC1FAA",
  },
  baseSepolia: {
    FACTORY_ETH:  "REPLACE_WITH_TESTNET_ESCROW_FACTORY_ADDRESS",
    FACTORY_USDC: "REPLACE_WITH_TESTNET_ESCROW_FACTORY_USDC_ADDRESS",
    USDC:         "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  },
};

// Minimal ABI — EscrowVaultUSDC (same shape as EscrowVault for ETH)
export const VAULT_USDC_ABI = [
  // State
  "function developer() view returns (address)",
  "function contractor() view returns (address)",
  "function retainageBps() view returns (uint256)",
  "function totalDeposited() view returns (uint256)",
  "function totalPaid() view returns (uint256)",
  "function retainageHeld() view returns (uint256)",
  "function milestoneCount() view returns (uint256)",
  "function milestones(uint256) view returns (uint256 amount, uint256 netPayable, uint8 status, bytes32 proofHash, uint64 submittedAt, uint64 approvedAt, uint64 paidAt)",

  // Write
  "function depositFunds(uint256 amount)",
  "function createMilestone(uint256 amount) returns (uint256 id)",
  "function submitMilestone(uint256 milestoneId, bytes32 proofHash)",
  "function approveMilestone(uint256 milestoneId)",
  "function payMilestone(uint256 milestoneId)",
  "function disputeMilestone(uint256 milestoneId, string reason)",
  "function releaseRetainage()",

  // Events
  "event Funded(address indexed from, uint256 amount)",
  "event MilestonePaid(uint256 indexed milestoneId, uint256 netAmount, uint256 retainageAmount)",
  "event MilestoneDisputed(uint256 indexed milestoneId, string reason)",
];

// Minimal ABI — EscrowVault (ETH) — same shape, no depositFunds
export const VAULT_ETH_ABI = [
  "function developer() view returns (address)",
  "function contractor() view returns (address)",
  "function retainageBps() view returns (uint256)",
  "function totalDeposited() view returns (uint256)",
  "function totalPaid() view returns (uint256)",
  "function retainageHeld() view returns (uint256)",
  "function milestoneCount() view returns (uint256)",
  "function milestones(uint256) view returns (uint256 amount, uint256 netPayable, uint8 status, bytes32 proofHash, uint64 submittedAt, uint64 approvedAt, uint64 paidAt)",
  "function createMilestone(uint256 amount) returns (uint256 id)",
  "function submitMilestone(uint256 milestoneId, bytes32 proofHash)",
  "function approveMilestone(uint256 milestoneId)",
  "function payMilestone(uint256 milestoneId)",
  "function disputeMilestone(uint256 milestoneId, string reason)",
  "function releaseRetainage()",
];

// Minimal USDC ERC-20 ABI (only what the UI needs)
export const USDC_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

// MilestoneStatus enum — mirrors Solidity
export const MilestoneStatus = {
  0: "NONE",
  1: "SUBMITTED",
  2: "APPROVED",
  3: "PAID",
  4: "DISPUTED",
};
