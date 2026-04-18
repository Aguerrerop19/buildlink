const { expect } = require("chai");
const { ethers } = require("hardhat");

// ─── Constants ────────────────────────────────────────────────────────────────

const RETAINAGE_BPS = 1000n;          // 10%
const THRESHOLD_BPS = 8000n;          // 80%
const MILESTONE_AMOUNT = 100_000_000n; // 100 USDC (6 decimals)
const PROOF_HASH = ethers.keccak256(ethers.toUtf8Bytes("inspection-report-001"));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Deploy a minimal ERC-20 that mints to deployer and supports approve/transfer/transferFrom */
async function deployMockUSDC(minter) {
  const MockERC20 = await ethers.getContractFactory("MockERC20", minter);
  return MockERC20.deploy();
}

/** Full vault setup used in most test groups */
async function setup() {
  const [owner, dev, contractor, oracle, stranger] = await ethers.getSigners();

  const usdc = await deployMockUSDC(owner);

  const Vault = await ethers.getContractFactory("EscrowVaultUSDC", owner);
  const vault = await Vault.deploy(
    dev.address,
    await usdc.getAddress(),
    contractor.address,
    RETAINAGE_BPS,
    THRESHOLD_BPS,
    oracle.address
  );

  // Fund dev wallet with USDC and pre-approve the vault
  const vaultAddr = await vault.getAddress();
  await usdc.mint(dev.address, 10_000_000_000n); // 10,000 USDC
  await usdc.connect(dev).approve(vaultAddr, ethers.MaxUint256);

  return { vault, usdc, vaultAddr, owner, dev, contractor, oracle, stranger };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("EscrowVaultUSDC", function () {

  // ── 1. Constructor ──────────────────────────────────────────────────────────

  describe("constructor", function () {
    it("sets developer to the _developer argument, not msg.sender", async function () {
      const { vault, dev, owner } = await setup();
      expect(await vault.developer()).to.equal(dev.address);
      expect(await vault.developer()).to.not.equal(owner.address);
    });

    it("sets contractor, retainageBps, oracleApprover correctly", async function () {
      const { vault, contractor, oracle } = await setup();
      expect(await vault.contractor()).to.equal(contractor.address);
      expect(await vault.retainageBps()).to.equal(RETAINAGE_BPS);
      expect(await vault.oracleApprover()).to.equal(oracle.address);
    });

    it("reverts if _developer is zero address", async function () {
      const [owner, , contractor, oracle] = await ethers.getSigners();
      const usdc = await deployMockUSDC(owner);
      const Vault = await ethers.getContractFactory("EscrowVaultUSDC");
      await expect(
        Vault.deploy(ethers.ZeroAddress, await usdc.getAddress(), contractor.address, RETAINAGE_BPS, THRESHOLD_BPS, oracle.address)
      ).to.be.revertedWith("Invalid developer");
    });

    it("reverts if retainageBps exceeds 2000 (20%)", async function () {
      const [owner, dev, contractor, oracle] = await ethers.getSigners();
      const usdc = await deployMockUSDC(owner);
      const Vault = await ethers.getContractFactory("EscrowVaultUSDC");
      await expect(
        Vault.deploy(dev.address, await usdc.getAddress(), contractor.address, 2001n, THRESHOLD_BPS, oracle.address)
      ).to.be.revertedWith("Retainage too high");
    });
  });

  // ── 2. depositFunds ─────────────────────────────────────────────────────────

  describe("depositFunds", function () {
    it("developer can deposit USDC and totalDeposited updates", async function () {
      const { vault, usdc, vaultAddr, dev } = await setup();
      await vault.connect(dev).depositFunds(MILESTONE_AMOUNT);
      expect(await vault.totalDeposited()).to.equal(MILESTONE_AMOUNT);
      expect(await usdc.balanceOf(vaultAddr)).to.equal(MILESTONE_AMOUNT);
    });

    it("emits Funded event", async function () {
      const { vault, dev } = await setup();
      await expect(vault.connect(dev).depositFunds(MILESTONE_AMOUNT))
        .to.emit(vault, "Funded")
        .withArgs(dev.address, MILESTONE_AMOUNT);
    });

    it("reverts if called by non-developer", async function () {
      const { vault, contractor, stranger } = await setup();
      await expect(vault.connect(contractor).depositFunds(MILESTONE_AMOUNT))
        .to.be.revertedWith("Only developer");
      await expect(vault.connect(stranger).depositFunds(MILESTONE_AMOUNT))
        .to.be.revertedWith("Only developer");
    });

    it("reverts on zero amount", async function () {
      const { vault, dev } = await setup();
      await expect(vault.connect(dev).depositFunds(0n))
        .to.be.revertedWith("Amount=0");
    });
  });

  // ── 3. createMilestone ──────────────────────────────────────────────────────

  describe("createMilestone", function () {
    it("only developer can create milestones", async function () {
      const { vault, contractor, stranger } = await setup();
      await expect(vault.connect(contractor).createMilestone(MILESTONE_AMOUNT))
        .to.be.revertedWith("Only developer");
      await expect(vault.connect(stranger).createMilestone(MILESTONE_AMOUNT))
        .to.be.revertedWith("Only developer");
    });

    it("stores amount and computes netPayable correctly at 10% retainage", async function () {
      const { vault, dev } = await setup();
      await vault.connect(dev).createMilestone(MILESTONE_AMOUNT);
      const m = await vault.milestones(0);
      expect(m.amount).to.equal(MILESTONE_AMOUNT);
      // net = 100 USDC - 10% = 90 USDC
      expect(m.netPayable).to.equal(90_000_000n);
      expect(m.status).to.equal(0); // NONE
    });

    it("increments milestoneCount", async function () {
      const { vault, dev } = await setup();
      expect(await vault.milestoneCount()).to.equal(0n);
      await vault.connect(dev).createMilestone(MILESTONE_AMOUNT);
      expect(await vault.milestoneCount()).to.equal(1n);
      await vault.connect(dev).createMilestone(MILESTONE_AMOUNT);
      expect(await vault.milestoneCount()).to.equal(2n);
    });

    it("emits MilestoneCreated with correct args", async function () {
      const { vault, dev } = await setup();
      await expect(vault.connect(dev).createMilestone(MILESTONE_AMOUNT))
        .to.emit(vault, "MilestoneCreated")
        .withArgs(0n, MILESTONE_AMOUNT, 90_000_000n);
    });

    it("reverts on zero amount", async function () {
      const { vault, dev } = await setup();
      await expect(vault.connect(dev).createMilestone(0n))
        .to.be.revertedWith("Amount=0");
    });
  });

  // ── 4. submitMilestone ──────────────────────────────────────────────────────

  describe("submitMilestone", function () {
    async function withMilestone() {
      const ctx = await setup();
      await ctx.vault.connect(ctx.dev).createMilestone(MILESTONE_AMOUNT);
      return ctx;
    }

    it("contractor can submit and status becomes SUBMITTED", async function () {
      const { vault, contractor } = await withMilestone();
      await vault.connect(contractor).submitMilestone(0, PROOF_HASH);
      const m = await vault.milestones(0);
      expect(m.status).to.equal(1); // SUBMITTED
      expect(m.proofHash).to.equal(PROOF_HASH);
      expect(m.submittedAt).to.be.gt(0n);
    });

    it("emits MilestoneSubmitted", async function () {
      const { vault, contractor } = await withMilestone();
      await expect(vault.connect(contractor).submitMilestone(0, PROOF_HASH))
        .to.emit(vault, "MilestoneSubmitted")
        .withArgs(0n, PROOF_HASH);
    });

    it("reverts if called by non-contractor", async function () {
      const { vault, dev, stranger } = await withMilestone();
      await expect(vault.connect(dev).submitMilestone(0, PROOF_HASH))
        .to.be.revertedWith("Only contractor");
      await expect(vault.connect(stranger).submitMilestone(0, PROOF_HASH))
        .to.be.revertedWith("Only contractor");
    });

    it("reverts on invalid milestone id", async function () {
      const { vault, contractor } = await withMilestone();
      await expect(vault.connect(contractor).submitMilestone(99, PROOF_HASH))
        .to.be.revertedWith("Invalid id");
    });

    it("reverts on zero proof hash", async function () {
      const { vault, contractor } = await withMilestone();
      await expect(vault.connect(contractor).submitMilestone(0, ethers.ZeroHash))
        .to.be.revertedWith("Invalid proof");
    });

    it("reverts if milestone is already SUBMITTED", async function () {
      const { vault, contractor } = await withMilestone();
      await vault.connect(contractor).submitMilestone(0, PROOF_HASH);
      await expect(vault.connect(contractor).submitMilestone(0, PROOF_HASH))
        .to.be.revertedWith("Wrong status");
    });

    it("can re-submit after DISPUTED", async function () {
      const { vault, dev, contractor } = await withMilestone();
      await vault.connect(contractor).submitMilestone(0, PROOF_HASH);
      await vault.connect(dev).disputeMilestone(0, "bad work");
      // Should not revert — DISPUTED allows resubmission
      await vault.connect(contractor).submitMilestone(0, PROOF_HASH);
      const m = await vault.milestones(0);
      expect(m.status).to.equal(1); // SUBMITTED again
    });
  });

  // ── 5. approveMilestone ─────────────────────────────────────────────────────

  describe("approveMilestone", function () {
    async function withSubmitted() {
      const ctx = await setup();
      await ctx.vault.connect(ctx.dev).createMilestone(MILESTONE_AMOUNT);
      await ctx.vault.connect(ctx.contractor).submitMilestone(0, PROOF_HASH);
      return ctx;
    }

    it("developer can approve", async function () {
      const { vault, dev } = await withSubmitted();
      await vault.connect(dev).approveMilestone(0);
      const m = await vault.milestones(0);
      expect(m.status).to.equal(2); // APPROVED
      expect(m.approvedAt).to.be.gt(0n);
    });

    it("oracleApprover can approve", async function () {
      const { vault, oracle } = await withSubmitted();
      await vault.connect(oracle).approveMilestone(0);
      const m = await vault.milestones(0);
      expect(m.status).to.equal(2); // APPROVED
    });

    it("emits MilestoneApproved", async function () {
      const { vault, dev } = await withSubmitted();
      await expect(vault.connect(dev).approveMilestone(0))
        .to.emit(vault, "MilestoneApproved")
        .withArgs(0n);
    });

    it("reverts if called by stranger", async function () {
      const { vault, stranger } = await withSubmitted();
      await expect(vault.connect(stranger).approveMilestone(0))
        .to.be.revertedWith("Not authorized");
    });

    it("reverts if called by contractor", async function () {
      const { vault, contractor } = await withSubmitted();
      await expect(vault.connect(contractor).approveMilestone(0))
        .to.be.revertedWith("Not authorized");
    });

    it("reverts if milestone not SUBMITTED", async function () {
      const { vault, dev } = await setup();
      await vault.connect(dev).createMilestone(MILESTONE_AMOUNT);
      // Status is NONE, not SUBMITTED
      await expect(vault.connect(dev).approveMilestone(0))
        .to.be.revertedWith("Not submitted");
    });
  });

  // ── 6. payMilestone ─────────────────────────────────────────────────────────

  describe("payMilestone", function () {
    async function withApproved() {
      const ctx = await setup();
      const { vault, usdc, vaultAddr, dev, contractor, oracle } = ctx;
      // Deposit enough to cover net payable (90 USDC) + retainage (10 USDC)
      await vault.connect(dev).depositFunds(MILESTONE_AMOUNT);
      await vault.connect(dev).createMilestone(MILESTONE_AMOUNT);
      await vault.connect(contractor).submitMilestone(0, PROOF_HASH);
      await vault.connect(dev).approveMilestone(0);
      return ctx;
    }

    it("developer can pay and USDC transfers to contractor", async function () {
      const { vault, usdc, vaultAddr, dev, contractor } = await withApproved();
      const contractorBefore = await usdc.balanceOf(contractor.address);
      await vault.connect(dev).payMilestone(0);
      const contractorAfter = await usdc.balanceOf(contractor.address);
      expect(contractorAfter - contractorBefore).to.equal(90_000_000n); // 90 USDC net
    });

    it("oracleApprover can pay", async function () {
      const { vault, usdc, oracle, contractor } = await withApproved();
      const contractorBefore = await usdc.balanceOf(contractor.address);
      await vault.connect(oracle).payMilestone(0);
      expect(await usdc.balanceOf(contractor.address) - contractorBefore).to.equal(90_000_000n);
    });

    it("status becomes PAID and paidAt is set", async function () {
      const { vault, dev } = await withApproved();
      await vault.connect(dev).payMilestone(0);
      const m = await vault.milestones(0);
      expect(m.status).to.equal(3); // PAID
      expect(m.paidAt).to.be.gt(0n);
    });

    it("totalPaid increments by netPayable, retainageHeld increments by retainage", async function () {
      const { vault, dev } = await withApproved();
      await vault.connect(dev).payMilestone(0);
      expect(await vault.totalPaid()).to.equal(90_000_000n);
      expect(await vault.retainageHeld()).to.equal(10_000_000n);
    });

    it("emits MilestonePaid with correct args", async function () {
      const { vault, dev } = await withApproved();
      await expect(vault.connect(dev).payMilestone(0))
        .to.emit(vault, "MilestonePaid")
        .withArgs(0n, 90_000_000n, 10_000_000n);
    });

    it("reverts if called by stranger", async function () {
      const { vault, stranger } = await withApproved();
      await expect(vault.connect(stranger).payMilestone(0))
        .to.be.revertedWith("Not authorized");
    });

    it("reverts if called by contractor", async function () {
      const { vault, contractor } = await withApproved();
      await expect(vault.connect(contractor).payMilestone(0))
        .to.be.revertedWith("Not authorized");
    });

    it("reverts if milestone is not APPROVED", async function () {
      const { vault, dev, contractor } = await setup();
      await vault.connect(dev).depositFunds(MILESTONE_AMOUNT);
      await vault.connect(dev).createMilestone(MILESTONE_AMOUNT);
      await vault.connect(contractor).submitMilestone(0, PROOF_HASH);
      // Status is SUBMITTED, not APPROVED
      await expect(vault.connect(dev).payMilestone(0))
        .to.be.revertedWith("Not approved");
    });

    it("reverts if vault has insufficient USDC balance", async function () {
      const { vault, usdc, vaultAddr, dev, contractor } = await setup();
      // Create milestone but do NOT deposit funds
      await vault.connect(dev).createMilestone(MILESTONE_AMOUNT);
      await vault.connect(contractor).submitMilestone(0, PROOF_HASH);
      await vault.connect(dev).approveMilestone(0);
      await expect(vault.connect(dev).payMilestone(0))
        .to.be.revertedWith("Insufficient escrow balance");
    });
  });

  // ── 7. releaseRetainage ─────────────────────────────────────────────────────

  describe("releaseRetainage", function () {
    // Helper: create N milestones, pay M of them, dispute the rest
    async function setupRetainage({ total, paid, disputed = 0 }) {
      const ctx = await setup();
      const { vault, usdc, dev, contractor, oracle } = ctx;

      // Deposit enough for all paid milestones
      const depositNeeded = MILESTONE_AMOUNT * BigInt(paid);
      if (depositNeeded > 0n) await vault.connect(dev).depositFunds(depositNeeded);

      for (let i = 0; i < total; i++) {
        await vault.connect(dev).createMilestone(MILESTONE_AMOUNT);
        await vault.connect(contractor).submitMilestone(i, PROOF_HASH);

        if (i < paid) {
          await vault.connect(dev).approveMilestone(i);
          await vault.connect(dev).payMilestone(i);
        } else if (i >= total - disputed) {
          await vault.connect(dev).disputeMilestone(i, "disputed");
        }
      }
      return ctx;
    }

    it("releases retainage when exactly 80% of milestones are PAID", async function () {
      // 4 milestones, 4 paid = 100% — well above threshold
      const { vault, usdc, dev, contractor } = await setupRetainage({ total: 4, paid: 4 });
      const contractorBefore = await usdc.balanceOf(contractor.address);
      await vault.connect(dev).releaseRetainage();
      const contractorAfter = await usdc.balanceOf(contractor.address);
      // Each milestone: 10 USDC retainage × 4 = 40 USDC
      expect(contractorAfter - contractorBefore).to.equal(40_000_000n);
      expect(await vault.retainageHeld()).to.equal(0n);
    });

    it("releases retainage when exactly 4 of 5 milestones paid (80%)", async function () {
      const { vault, usdc, dev, contractor } = await setupRetainage({ total: 5, paid: 4 });
      // 4/5 = 80% = threshold exactly — should pass
      await expect(vault.connect(dev).releaseRetainage()).to.not.be.reverted;
    });

    it("reverts when below 80% threshold (3 of 5 paid = 60%)", async function () {
      const { vault, dev } = await setupRetainage({ total: 5, paid: 3 });
      await expect(vault.connect(dev).releaseRetainage())
        .to.be.revertedWith("Threshold not met");
    });

    it("excludes DISPUTED milestones from eligible count", async function () {
      // 5 milestones: 4 paid, 1 disputed
      // eligible = 5 - 1 = 4; paid = 4; 4/4 = 100% — should pass
      const { vault, dev } = await setupRetainage({ total: 5, paid: 4, disputed: 1 });
      await expect(vault.connect(dev).releaseRetainage()).to.not.be.reverted;
    });

    it("reverts if threshold not met even after excluding disputed", async function () {
      // 5 milestones: 2 paid, 1 disputed
      // eligible = 5 - 1 = 4; paid = 2; 2/4 = 50% — below 80%
      const { vault, dev } = await setupRetainage({ total: 5, paid: 2, disputed: 1 });
      await expect(vault.connect(dev).releaseRetainage())
        .to.be.revertedWith("Threshold not met");
    });

    it("reverts with 'Threshold not met' when no milestones are paid", async function () {
      const { vault, dev } = await setup();
      await vault.connect(dev).createMilestone(MILESTONE_AMOUNT);
      // 1 milestone, 0 paid → 0/1 = 0% < 80%
      await expect(vault.connect(dev).releaseRetainage())
        .to.be.revertedWith("Threshold not met");
    });

    it("reverts with 'No eligible milestones' when all milestones are disputed", async function () {
      const { vault, dev, contractor } = await setup();
      await vault.connect(dev).createMilestone(MILESTONE_AMOUNT);
      await vault.connect(contractor).submitMilestone(0, PROOF_HASH);
      await vault.connect(dev).disputeMilestone(0, "all disputed");
      // eligible = 1 - 1 = 0
      await expect(vault.connect(dev).releaseRetainage())
        .to.be.revertedWith("No eligible milestones");
    });

    it("reverts if called by non-developer", async function () {
      const { vault, usdc, dev, contractor } = await setupRetainage({ total: 2, paid: 2 });
      await expect(vault.connect(contractor).releaseRetainage())
        .to.be.revertedWith("Only developer");
    });

    it("emits RetainageReleased", async function () {
      const { vault, dev } = await setupRetainage({ total: 2, paid: 2 });
      await expect(vault.connect(dev).releaseRetainage())
        .to.emit(vault, "RetainageReleased")
        .withArgs(20_000_000n); // 2 × 10 USDC retainage
    });
  });

  // ── 8. disputeMilestone ─────────────────────────────────────────────────────

  describe("disputeMilestone", function () {
    it("developer can dispute a SUBMITTED milestone", async function () {
      const { vault, dev, contractor } = await setup();
      await vault.connect(dev).createMilestone(MILESTONE_AMOUNT);
      await vault.connect(contractor).submitMilestone(0, PROOF_HASH);
      await vault.connect(dev).disputeMilestone(0, "work incomplete");
      const m = await vault.milestones(0);
      expect(m.status).to.equal(4); // DISPUTED
    });

    it("developer can dispute an APPROVED milestone", async function () {
      const { vault, dev, contractor } = await setup();
      await vault.connect(dev).createMilestone(MILESTONE_AMOUNT);
      await vault.connect(contractor).submitMilestone(0, PROOF_HASH);
      await vault.connect(dev).approveMilestone(0);
      await vault.connect(dev).disputeMilestone(0, "changed my mind");
      const m = await vault.milestones(0);
      expect(m.status).to.equal(4); // DISPUTED
    });

    it("emits MilestoneDisputed with reason", async function () {
      const { vault, dev, contractor } = await setup();
      await vault.connect(dev).createMilestone(MILESTONE_AMOUNT);
      await vault.connect(contractor).submitMilestone(0, PROOF_HASH);
      await expect(vault.connect(dev).disputeMilestone(0, "bad work"))
        .to.emit(vault, "MilestoneDisputed")
        .withArgs(0n, "bad work");
    });

    it("reverts if called by non-developer", async function () {
      const { vault, dev, contractor, stranger } = await setup();
      await vault.connect(dev).createMilestone(MILESTONE_AMOUNT);
      await vault.connect(contractor).submitMilestone(0, PROOF_HASH);
      await expect(vault.connect(contractor).disputeMilestone(0, "reason"))
        .to.be.revertedWith("Only developer");
      await expect(vault.connect(stranger).disputeMilestone(0, "reason"))
        .to.be.revertedWith("Only developer");
    });

    it("reverts if milestone is NONE (not yet submitted)", async function () {
      const { vault, dev } = await setup();
      await vault.connect(dev).createMilestone(MILESTONE_AMOUNT);
      await expect(vault.connect(dev).disputeMilestone(0, "reason"))
        .to.be.revertedWith("Not disputable");
    });

    it("reverts if milestone is already PAID", async function () {
      const { vault, usdc, dev, contractor } = await setup();
      await vault.connect(dev).depositFunds(MILESTONE_AMOUNT);
      await vault.connect(dev).createMilestone(MILESTONE_AMOUNT);
      await vault.connect(contractor).submitMilestone(0, PROOF_HASH);
      await vault.connect(dev).approveMilestone(0);
      await vault.connect(dev).payMilestone(0);
      await expect(vault.connect(dev).disputeMilestone(0, "too late"))
        .to.be.revertedWith("Not disputable");
    });
  });

});
