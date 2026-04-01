# BuildLink Frontend Snippets — Integration Guide

All snippets are in `buildlink/frontend-snippets/`. Copy each file to the corresponding
location in `buildlink-frontend/src/` and follow the steps below.

---

## File map

```
frontend-snippets/                  →  buildlink-frontend/src/
  constants/contracts.js            →  constants/contracts.js
  utils/format.js                   →  utils/format.js
  data/mockProjects.js              →  data/mockProjects.js
  components/AssetBadge.jsx         →  components/AssetBadge.jsx
  components/ProjectCard.jsx        →  components/ProjectCard.jsx
  components/MilestoneActions.jsx   →  components/MilestoneActions.jsx
  components/SOVTable.jsx           →  components/SOVTable.jsx
  hooks/useEscrowUSDC.js            →  hooks/useEscrowUSDC.js
```

---

## Step 1 — Fill in contract addresses

In `constants/contracts.js`, replace the placeholder strings:

```js
FACTORY_ETH:  "0x...",   // from original deploy.js output
FACTORY_USDC: "0x...",   // from deployUSDC.js output (after deploying)
```

---

## Step 2 — Wire ProjectCard into your project list

Find where your project list renders. Replace or extend your existing card with:

```jsx
import { ProjectCard } from "./components/ProjectCard";
import { MOCK_PROJECTS } from "./data/mockProjects";

// Swap MOCK_PROJECTS for live on-chain data when ready
export function ProjectList() {
  return (
    <div style={{ display: "grid", gap: "16px" }}>
      {MOCK_PROJECTS.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onSelect={(p) => navigate(`/projects/${p.id}`)}
        />
      ))}
    </div>
  );
}
```

---

## Step 3 — Wire SOVTable into project detail

```jsx
import { SOVTable } from "./components/SOVTable";
import { MOCK_SOV } from "./data/mockProjects";

export function ProjectDetail({ projectId, asset }) {
  const rows = MOCK_SOV[projectId] ?? [];
  return <SOVTable rows={rows} asset={asset} />;
}
```

---

## Step 4 — Wire MilestoneActions

```jsx
import { MilestoneActions } from "./components/MilestoneActions";
import { useEscrowUSDC } from "./hooks/useEscrowUSDC";
import { useAccount } from "wagmi";

export function MilestoneRow({ milestone, vaultAddress, usdcAddress }) {
  const { address } = useAccount();
  const { role, isPending, submitMilestone, approveMilestone, payMilestone, disputeMilestone } =
    useEscrowUSDC(vaultAddress, usdcAddress, address);

  return (
    <MilestoneActions
      milestoneId={milestone.id}
      status={milestone.status}
      role={role}
      isPending={isPending}
      onSubmit={(id) => submitMilestone(id, "ipfs://Qm...")}
      onApprove={approveMilestone}
      onRelease={payMilestone}
      onDispute={(id) => disputeMilestone(id, "Work incomplete per inspection")}
    />
  );
}
```

---

## Step 5 — ETH vault (existing projects)

The existing ETH vault hook follows the same pattern. The only difference:
- No `depositFunds()` — funding is via `receive()` (send ETH directly to vault)
- Use `useBalance({ address: vaultAddress })` for balance instead of USDC balanceOf

---

## Step 6 — Deploy USDC contracts (when ready)

```bash
# From buildlink/ repo
npx hardhat run scripts/deployUSDC.js --network base
```

Save the printed `EscrowFactoryUSDC` address into `constants/contracts.js`.

---

## Compliance section (Task 4 — conceptual, off-chain)

These fields are displayed in the UI but stored off-chain (database or IPFS):

| Field           | Where to show         | Source         |
|-----------------|-----------------------|----------------|
| OCIP / CCIP     | Project detail header | Off-chain DB   |
| Bonds           | Project detail header | Off-chain DB   |
| COI             | Contractor profile    | Off-chain DB   |
| Lien waivers    | Milestone row         | Off-chain DB   |
| Dispute flag    | Milestone status      | On-chain event |
| Resolution date | Milestone status      | Off-chain DB   |

No on-chain changes needed for these. Add them as optional fields to your
project and milestone data models.
