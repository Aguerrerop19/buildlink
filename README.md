# BuildLink

**Automated milestone-based escrow for construction — powered by smart contracts.**

BuildLink eliminates payment delays, retainage disputes, and administrative overhead in real estate development by replacing manual processes with programmable financial infrastructure on-chain.

---

## The Problem

In construction and real estate development, getting paid is slow and unreliable:

- Milestone payments require manual approvals, inspections, and sign-offs
- Retainage is held arbitrarily and released late — or disputed
- No transparency between developers, contractors, and lenders
- Cash flow instability forces contractors to finance their own work

There is no programmable infrastructure connecting real-world construction milestones to automated financial execution.

---

## The Solution

BuildLink locks project funds in a smart contract escrow. Payments are released automatically when milestone conditions are met — with reduced delays, faster execution, and a full on-chain audit trail.

- Developer deposits funds into the escrow vault
- Contractor submits proof of completion (hash of inspection, delivery, sign-off)
- Developer approves the milestone
- Funds are released on-chain upon approval
- Retainage is held automatically and released at project closeout

---

## Live Contracts — Base Mainnet

### ETH Escrow

| Contract | Address |
|---|---|
| EscrowFactory | [0x5Ead178647b041B47A8598d97524d94495b95E57](https://basescan.org/address/0x5Ead178647b041B47A8598d97524d94495b95E57) |
| BuildLinkFunctionsConsumer | [0xAf82c9E5Dfc7c6380c2c0a3407de7f8030503c95](https://basescan.org/address/0xAf82c9E5Dfc7c6380c2c0a3407de7f8030503c95) |

> EscrowVault is deployed per project automatically by EscrowFactory.

### USDC Escrow

| Contract | Address |
|---|---|
| EscrowFactoryUSDC | [0xfFe1102F036b8bD652B40979dcBa073211A72688](https://basescan.org/address/0xfFe1102F036b8bD652B40979dcBa073211A72688) |
| USDC (Base Mainnet) | [0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913](https://basescan.org/address/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913) |

> EscrowVaultUSDC is deployed per project automatically by EscrowFactoryUSDC. Contract verified on Basescan.

---

## Live Demo — Base Mainnet

End-to-end Chainlink Functions oracle loop proven on 2026-04-06:

| Step | Transaction |
|---|---|
| sendRequest() called | [0xedef20d0...](https://basescan.org/tx/0xedef20d02efb5444ea82e9524a763492395555bd3e75ff2a70903b9f89e31856) |
| fulfillRequest + MilestoneVerified | [0x74b065f6...](https://basescan.org/tx/0x74b065f6dc534eb217b222c6b2279d9dc9e88dcfba790217ddb89f5eee4e17a9) |
| approveMilestone confirmed | [0xa5a89bea...](https://basescan.org/tx/0xa5a89bea0db49bc541ee4857a52a89a21767ae09fb0241cb7f202456e72aa02e) |

This demonstrates a full oracle-driven payment trigger from off-chain approval to on-chain execution.

Chainlink DON fulfilled in ~41 seconds on Base Mainnet.
Vault: 0x6E181b570d447354d9127eB713960eE32852daDF
Consumer: 0xAf82c9E5Dfc7c6380c2c0a3407de7f8030503c95
Subscription ID: 143

---

## How It Works

### ETH flow
```
Developer creates project → EscrowFactory deploys EscrowVault
Developer funds vault → ETH locked in escrow
Developer creates milestones → Contractor gets to work
Contractor submits proof hash → Developer reviews and approves
Developer pays milestone → Net amount released, retainage held
80% of milestones PAID (DISPUTED milestones excluded) → Developer releases retainage
```

### USDC flow
```
Developer creates project → EscrowFactoryUSDC deploys EscrowVaultUSDC
Developer approves USDC spend → Developer calls depositFunds()
Developer creates milestones → Contractor gets to work
Contractor submits proof hash → Developer reviews and approves
Developer pays milestone → USDC released, retainage held
80% of milestones PAID (DISPUTED milestones excluded) → Developer releases retainage in USDC
```

---

## Architecture

```
ETH System
──────────
EscrowFactory.sol
└── Deploys one EscrowVault per project

EscrowVault.sol
└── Milestone state machine: NONE → SUBMITTED → APPROVED → PAID → DISPUTED
└── Native ETH deposits via receive()
└── Retainage logic: held per milestone, released at closeout

USDC System
───────────
EscrowFactoryUSDC.sol
└── Deploys one EscrowVaultUSDC per project
└── USDC address set at factory deployment

EscrowVaultUSDC.sol
└── Mirrors EscrowVault logic using IERC20 (USDC, 6 decimals)
└── depositFunds(uint256) with ERC-20 transferFrom instead of receive()
└── Milestone state machine: NONE → SUBMITTED → APPROVED → PAID → DISPUTED
└── Retainage logic: held per milestone, released at closeout
└── Follows checks-effects-interactions

Shared
──────
BuildLinkFunctionsConsumer.sol
└── Live on Base Mainnet — real FunctionsClient, subscription 143, funded DON, wired to approveMilestone on EscrowVaultUSDC
```

---

## Milestone States

| State | Description |
|---|---|
| NONE | Milestone created, waiting for contractor |
| SUBMITTED | Contractor submitted proof hash |
| APPROVED | Developer approved, ready to pay |
| PAID | Payment released to contractor |
| DISPUTED | Developer disputed the submission |

---

## Quick Start

```bash
git clone https://github.com/Aguerrerop19/buildlink
cd buildlink
npm install
npx hardhat compile
```

Deploy ETH contracts to Base mainnet:
```bash
cp .env.example .env
# Fill in your PRIVATE_KEY and BASE_MAINNET_RPC_URL
npx hardhat run scripts/deploy.js --network base
```

Deploy USDC contracts to Base mainnet:
```bash
npx hardhat run scripts/deployUSDC.js --network base
```

---

## Tech Stack

- Solidity ^0.8.20
- Hardhat
- Base (Coinbase L2)
- USDC (Circle, native Base Mainnet)
- Chainlink Functions (live — subscription 143, Base Mainnet)
- wagmi v2 + RainbowKit v2 + viem v2 (frontend)
- Next.js 16 + TypeScript + Tailwind CSS (frontend)
- Vercel (deployment)

---

## Vision

BuildLink is the financial infrastructure layer for construction:

- Automated retainage logic triggered by project completion
- Tokenized milestone financing for lenders
- On-chain disbursements augmenting and improving traditional payment systems
- Transparent payment flows for all stakeholders

---

## Why Chainlink

BuildLink uses Chainlink Functions to bridge real-world construction approvals with on-chain financial execution.

- **Secure verification of off-chain milestone approvals** — the Chainlink DON fetches and validates approval data from external systems before any payment logic executes
- **Trust-minimized execution of payments** — no single party controls the trigger; the oracle network enforces the condition
- **A scalable path to integrate real construction platforms like Procore** — the webhook interface is designed to accept HMAC-signed approval events from existing project management platforms

---

## Integration

BuildLink does not change how construction teams work — it improves how capital is executed within existing workflows.

It is not a replacement for Procore or Textura. It is a financial infrastructure layer that sits alongside them:

- **Procore / Textura** — Handle project data, SOV approvals, milestone documentation, and team workflows
- **Chainlink Functions** — Bridges off-chain approvals to on-chain execution via a trust-minimized oracle network
- **BuildLink Vault** — Executes programmable milestone payments on Base Mainnet with reduced delays, faster settlement, and a full audit trail

Webhook endpoint (conceptual): POST /api/procore/webhook
Chainlink Functions consumer: 0xAf82c9E5Dfc7c6380c2c0a3407de7f8030503c95

---

Built by: Abraham J. Guerrero
