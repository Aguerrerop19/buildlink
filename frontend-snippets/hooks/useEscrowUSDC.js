// useEscrowUSDC.js — wagmi v2 hook for interacting with EscrowVaultUSDC.
//
// INTEGRATION:
//   1. Import in your project detail page or milestone view.
//   2. Pass the vault address from EscrowFactoryUSDC.projects(id).vault
//   3. The USDC address comes from constants/contracts.js
//
// Requires: wagmi v2, viem
//   npm install wagmi viem
//
// All write functions return the transaction hash.
// `isPending` is true while any tx is awaiting confirmation.

import { useState } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { parseUnits, keccak256, toHex } from "viem";
import { VAULT_USDC_ABI, USDC_ABI } from "../constants/contracts";

/**
 * Hook to read and interact with a single EscrowVaultUSDC instance.
 *
 * @param {`0x${string}`} vaultAddress  Address of the deployed EscrowVaultUSDC
 * @param {`0x${string}`} usdcAddress   USDC token address (from constants/contracts.js)
 * @param {`0x${string}`} [userAddress] Connected wallet address (from wagmi useAccount)
 */
export function useEscrowUSDC(vaultAddress, usdcAddress, userAddress) {
  const [pendingTxHash, setPendingTxHash] = useState(null);

  const { writeContractAsync } = useWriteContract();

  // Wait for the latest pending tx
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: pendingTxHash,
  });

  const isPending = isConfirming;

  // ── READ: Vault state ──────────────────────────────────────────────────────

  const { data: developer } = useReadContract({
    address: vaultAddress,
    abi: VAULT_USDC_ABI,
    functionName: "developer",
  });

  const { data: contractor } = useReadContract({
    address: vaultAddress,
    abi: VAULT_USDC_ABI,
    functionName: "contractor",
  });

  const { data: retainageBps } = useReadContract({
    address: vaultAddress,
    abi: VAULT_USDC_ABI,
    functionName: "retainageBps",
  });

  const { data: totalDeposited } = useReadContract({
    address: vaultAddress,
    abi: VAULT_USDC_ABI,
    functionName: "totalDeposited",
  });

  const { data: totalPaid } = useReadContract({
    address: vaultAddress,
    abi: VAULT_USDC_ABI,
    functionName: "totalPaid",
  });

  const { data: retainageHeld } = useReadContract({
    address: vaultAddress,
    abi: VAULT_USDC_ABI,
    functionName: "retainageHeld",
  });

  const { data: milestoneCount } = useReadContract({
    address: vaultAddress,
    abi: VAULT_USDC_ABI,
    functionName: "milestoneCount",
  });

  // USDC balance of vault
  const { data: vaultUSDCBalance } = useReadContract({
    address: usdcAddress,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: [vaultAddress],
  });

  // User USDC allowance to vault
  const { data: usdcAllowance } = useReadContract({
    address: usdcAddress,
    abi: USDC_ABI,
    functionName: "allowance",
    args: [userAddress, vaultAddress],
    query: { enabled: !!userAddress },
  });

  // Derived role
  const role =
    userAddress?.toLowerCase() === developer?.toLowerCase()
      ? "developer"
      : userAddress?.toLowerCase() === contractor?.toLowerCase()
      ? "contractor"
      : null;

  // ── WRITE: Vault actions ───────────────────────────────────────────────────

  /**
   * Approve USDC spend + deposit funds into vault.
   * Call this before the first milestone to fund the escrow.
   * @param {number} amountUSD  Human-readable USDC amount (e.g. 50000 for $50,000)
   */
  async function depositFunds(amountUSD) {
    const amount = parseUnits(String(amountUSD), 6); // USDC = 6 decimals

    // Step 1: approve USDC if allowance is insufficient
    if (!usdcAllowance || usdcAllowance < amount) {
      const approveTx = await writeContractAsync({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: "approve",
        args: [vaultAddress, amount],
      });
      setPendingTxHash(approveTx);
      // Note: in production, wait for approve tx before depositing.
      // For simplicity here, the UI should call depositFunds again after approval.
      return { step: "approve", hash: approveTx };
    }

    // Step 2: deposit
    const hash = await writeContractAsync({
      address: vaultAddress,
      abi: VAULT_USDC_ABI,
      functionName: "depositFunds",
      args: [amount],
    });
    setPendingTxHash(hash);
    return { step: "deposit", hash };
  }

  /**
   * Contractor submits a milestone with a proof hash.
   * @param {number} milestoneId
   * @param {string} proofString  Off-chain document reference, IPFS CID, or inspection ID.
   *                              Will be keccak256-hashed on the client before submitting.
   */
  async function submitMilestone(milestoneId, proofString) {
    const proofHash = keccak256(toHex(proofString));
    const hash = await writeContractAsync({
      address: vaultAddress,
      abi: VAULT_USDC_ABI,
      functionName: "submitMilestone",
      args: [BigInt(milestoneId), proofHash],
    });
    setPendingTxHash(hash);
    return hash;
  }

  /**
   * Developer approves a submitted milestone.
   */
  async function approveMilestone(milestoneId) {
    const hash = await writeContractAsync({
      address: vaultAddress,
      abi: VAULT_USDC_ABI,
      functionName: "approveMilestone",
      args: [BigInt(milestoneId)],
    });
    setPendingTxHash(hash);
    return hash;
  }

  /**
   * Developer releases USDC payment for an approved milestone.
   */
  async function payMilestone(milestoneId) {
    const hash = await writeContractAsync({
      address: vaultAddress,
      abi: VAULT_USDC_ABI,
      functionName: "payMilestone",
      args: [BigInt(milestoneId)],
    });
    setPendingTxHash(hash);
    return hash;
  }

  /**
   * Developer disputes a submitted or approved milestone.
   * @param {number} milestoneId
   * @param {string} reason  Short description of the dispute.
   */
  async function disputeMilestone(milestoneId, reason) {
    const hash = await writeContractAsync({
      address: vaultAddress,
      abi: VAULT_USDC_ABI,
      functionName: "disputeMilestone",
      args: [BigInt(milestoneId), reason],
    });
    setPendingTxHash(hash);
    return hash;
  }

  /**
   * Developer releases all retainage at project closeout.
   * All milestones must be PAID.
   */
  async function releaseRetainage() {
    const hash = await writeContractAsync({
      address: vaultAddress,
      abi: VAULT_USDC_ABI,
      functionName: "releaseRetainage",
    });
    setPendingTxHash(hash);
    return hash;
  }

  return {
    // State
    developer,
    contractor,
    retainageBps,
    totalDeposited,
    totalPaid,
    retainageHeld,
    milestoneCount,
    vaultUSDCBalance,
    usdcAllowance,
    role,
    isPending,
    pendingTxHash,

    // Actions
    depositFunds,
    submitMilestone,
    approveMilestone,
    payMilestone,
    disputeMilestone,
    releaseRetainage,
  };
}
