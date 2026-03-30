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

BuildLink locks project funds in a smart contract escrow. Payments are released automatically when milestone conditions are met — no middlemen, no delays, no disputes.

- Developer deposits funds into the escrow vault
- Contractor submits proof of completion (hash of inspection, delivery, sign-off)
- Developer approves the milestone
- Funds are released instantly and on-chain
- Retainage is held automatically and released at project closeout

---

## Live Contracts — Base Mainnet

| Contract | Address |
|---|---|
| EscrowFactory | [0x20f5cB9063E6bB1461FD5C2a2CA638FC50474B1E](https://basescan.org/address/0x20f5cB9063E6bB1461FD5C2a2CA638FC50474B1E) |
| BuildLinkFunctionsConsumer | [0x9EA6AEc15632B3B2180C9BEBEF2C61E68D16243b](https://basescan.org/address/0x9EA6AEc15632B3B2180C9BEBEF2C61E68D16243b) |

> EscrowVault is deployed per project automatically by EscrowFactory.

---

## How It Works

```
Developer creates project → EscrowFactory deploys EscrowVault
Developer funds vault → ETH locked in escrow
Developer creates milestones → Contractor gets to work
Contractor submits proof hash → Developer reviews and approves
Developer pays milestone → Net amount released, retainage held
All milestones paid → Developer releases retainage
```

---

## Architecture

```
EscrowFactory.sol
└── Deploys one EscrowVault per project

EscrowVault.sol
└── Milestone state machine: NONE → SUBMITTED → APPROVED → PAID
└── Retainage logic: held per milestone, released at closeout
└── Dispute handling: developer can dispute any submitted milestone

BuildLinkFunctionsConsumer.sol
└── Oracle interaction layer (MVP mock — Chainlink Functions architecture-ready)
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

Deploy to Base mainnet:
```bash
cp .env.example .env
# Fill in your PRIVATE_KEY and BASE_MAINNET_RPC_URL
npx hardhat run scripts/deploy.js --network base
```

---

## Tech Stack

- Solidity ^0.8.20
- Hardhat
- Base (Coinbase L2)
- Chainlink Functions (architecture-ready)

---

## Vision

BuildLink is the financial infrastructure layer for construction:

- Automated retainage logic triggered by project completion
- Tokenized milestone financing for lenders
- On-chain disbursements replacing wire transfers
- Transparent payment flows for all stakeholders

---

Built by [Abraham Guerrero](https://github.com/Aguerrerop19)
