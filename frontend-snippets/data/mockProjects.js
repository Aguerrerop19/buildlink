// mockProjects.js — Realistic construction project mock data for BuildLink UI
// Swap these out for live on-chain reads once contracts are wired up.
// USDC amounts are raw (6 decimals). ETH amounts are raw (18 decimals).

export const MOCK_PROJECTS = [
  {
    id: 1,
    name: "Rivage Tower — Framing Package",
    address: "2601 S Bayshore Dr, Miami, FL 33133",
    description: "Wood framing for 12-story luxury residential tower. Includes structural framing, sheathing, and blocking per SD-100 drawings.",
    developer: "0xDev1000000000000000000000000000000000001",
    developerName: "Atlantic Capital Group LLC",
    contractor: "0xCon2000000000000000000000000000000000002",
    contractorName: "SteelFrame Builders Inc.",
    asset: "USDC",
    contractValue: 1_200_000_00_0000n,  // $1,200,000.00 in USDC (6 dec)
    startDate: "2026-01-15",
    completionDate: "2026-09-30",
    retainageBps: 500, // 5%
    status: "In Progress",
    vaultAddress: "0xVault000000000000000000000000000000001",
    totalDeposited: 600_000_000_000n,   // $600,000
    totalPaid: 95_000_000_000n,         // $95,000
    retainageHeld: 5_000_000_000n,      // $5,000
    lastDraw: "2026-03-10",
    milestones: [
      {
        id: 0,
        name: "Framing — Level 1–4",
        amount: 100_000_000_000n,        // $100,000
        netPayable: 95_000_000_000n,     // $95,000 (5% retainage)
        status: 3,                        // PAID
        submittedAt: 1741564800,
        approvedAt: 1741651200,
        paidAt: 1741737600,
        proofHash: "0xabc123...",
        percentComplete: 100,
        currentDraw: 95_000_000_000n,
        retainage: 5_000_000_000n,
        balanceToFinish: 0n,
      },
      {
        id: 1,
        name: "Framing — Level 5–8",
        amount: 100_000_000_000n,
        netPayable: 95_000_000_000n,
        status: 1,                        // SUBMITTED
        submittedAt: 1743379200,
        approvedAt: 0,
        paidAt: 0,
        proofHash: "0xdef456...",
        percentComplete: 60,
        currentDraw: 57_000_000_000n,     // 60% of net
        retainage: 3_000_000_000n,
        balanceToFinish: 38_000_000_000n,
      },
      {
        id: 2,
        name: "Framing — Level 9–12 + Roof",
        amount: 100_000_000_000n,
        netPayable: 95_000_000_000n,
        status: 0,                        // NONE
        submittedAt: 0,
        approvedAt: 0,
        paidAt: 0,
        proofHash: null,
        percentComplete: 0,
        currentDraw: 0n,
        retainage: 0n,
        balanceToFinish: 100_000_000_000n,
      },
    ],
  },
  {
    id: 2,
    name: "Harbor View — Electrical Rough-In",
    address: "400 Alton Rd, Miami Beach, FL 33139",
    description: "Complete electrical rough-in for mixed-use commercial building. Panels, conduit, and rough wiring per E-series drawings.",
    developer: "0xDev1000000000000000000000000000000000001",
    developerName: "Atlantic Capital Group LLC",
    contractor: "0xCon3000000000000000000000000000000000003",
    contractorName: "Volt Electric Solutions LLC",
    asset: "USDC",
    contractValue: 450_000_000_000n,    // $450,000
    startDate: "2026-02-01",
    completionDate: "2026-07-15",
    retainageBps: 1000, // 10%
    status: "Funded",
    vaultAddress: "0xVault000000000000000000000000000000002",
    totalDeposited: 225_000_000_000n,   // $225,000
    totalPaid: 0n,
    retainageHeld: 0n,
    lastDraw: null,
    milestones: [
      {
        id: 0,
        name: "Rough-In — Floors 1–3",
        amount: 75_000_000_000n,         // $75,000
        netPayable: 67_500_000_000n,     // $67,500 (10% retainage)
        status: 0,                        // NONE
        submittedAt: 0,
        approvedAt: 0,
        paidAt: 0,
        proofHash: null,
        percentComplete: 50,
        currentDraw: 0n,
        retainage: 0n,
        balanceToFinish: 75_000_000_000n,
      },
      {
        id: 1,
        name: "Panels & Main Distribution",
        amount: 100_000_000_000n,
        netPayable: 90_000_000_000n,
        status: 0,
        submittedAt: 0,
        approvedAt: 0,
        paidAt: 0,
        proofHash: null,
        percentComplete: 0,
        currentDraw: 0n,
        retainage: 0n,
        balanceToFinish: 100_000_000_000n,
      },
    ],
  },
  {
    id: 3,
    name: "Brickell Heights — General Contract",
    address: "888 Brickell Ave, Miami, FL 33131",
    description: "Full general contract for 8-story boutique hotel renovation. Scope includes MEP, finishes, and FF&E installation.",
    developer: "0xDev4000000000000000000000000000000000004",
    developerName: "Horizon Hospitality Partners",
    contractor: "0xCon5000000000000000000000000000000000005",
    contractorName: "Meridian Construction Group",
    asset: "ETH",
    contractValue: 850_000_000_000_000_000_000n, // 850 ETH (18 dec)
    startDate: "2025-11-01",
    completionDate: "2026-12-31",
    retainageBps: 500,
    status: "In Progress",
    vaultAddress: "0xVault000000000000000000000000000000003",
    totalDeposited: 425_000_000_000_000_000_000n,
    totalPaid: 190_000_000_000_000_000_000n,
    retainageHeld: 10_000_000_000_000_000_000n,
    lastDraw: "2026-02-28",
    milestones: [],
  },
];

// Schedule of Values (SOV) mock — off-chain, per project
// Keys are projectId
export const MOCK_SOV = {
  1: [
    {
      lineItem: "01 — Framing Level 1–4",
      scheduledValue: 100_000_000_000n,
      percentComplete: 100,
      workCompletedThisPeriod: 0n,
      workCompletedPrior: 100_000_000_000n,
      storedMaterials: 0n,
      totalCompleted: 100_000_000_000n,
      retainage: 5_000_000_000n,
      netPayable: 95_000_000_000n,
      balanceToFinish: 0n,
      status: "Paid",
    },
    {
      lineItem: "02 — Framing Level 5–8",
      scheduledValue: 100_000_000_000n,
      percentComplete: 60,
      workCompletedThisPeriod: 60_000_000_000n,
      workCompletedPrior: 0n,
      storedMaterials: 5_000_000_000n,
      totalCompleted: 65_000_000_000n,
      retainage: 3_250_000_000n,
      netPayable: 61_750_000_000n,
      balanceToFinish: 35_000_000_000n,
      status: "Pending",
    },
    {
      lineItem: "03 — Framing Level 9–12 + Roof",
      scheduledValue: 100_000_000_000n,
      percentComplete: 0,
      workCompletedThisPeriod: 0n,
      workCompletedPrior: 0n,
      storedMaterials: 0n,
      totalCompleted: 0n,
      retainage: 0n,
      netPayable: 0n,
      balanceToFinish: 100_000_000_000n,
      status: "Not Started",
    },
  ],
  2: [
    {
      lineItem: "01 — Rough-In Floors 1–3",
      scheduledValue: 75_000_000_000n,
      percentComplete: 50,
      workCompletedThisPeriod: 37_500_000_000n,
      workCompletedPrior: 0n,
      storedMaterials: 10_000_000_000n,
      totalCompleted: 47_500_000_000n,
      retainage: 4_750_000_000n,
      netPayable: 42_750_000_000n,
      balanceToFinish: 27_500_000_000n,
      status: "Pending",
    },
    {
      lineItem: "02 — Panels & Main Distribution",
      scheduledValue: 100_000_000_000n,
      percentComplete: 0,
      workCompletedThisPeriod: 0n,
      workCompletedPrior: 0n,
      storedMaterials: 0n,
      totalCompleted: 0n,
      retainage: 0n,
      netPayable: 0n,
      balanceToFinish: 100_000_000_000n,
      status: "Not Started",
    },
  ],
};
