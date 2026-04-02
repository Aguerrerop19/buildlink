// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title EscrowVaultUSDC - Milestone-based escrow for construction payments (USDC)
/// @notice Mirrors EscrowVault logic using ERC-20 (USDC) instead of native ETH.
///         Does NOT modify or replace the existing ETH escrow system.
contract EscrowVaultUSDC {
    enum MilestoneStatus { NONE, SUBMITTED, APPROVED, PAID, DISPUTED }

    IERC20 public immutable usdc;
    address public immutable developer;
    address public immutable contractor;

    uint256 public immutable retainageBps; // e.g. 500 = 5%
    uint256 public retainageReleaseThresholdBps; // e.g. 8000 = 80%
    uint256 public totalDeposited;
    uint256 public totalPaid;
    uint256 public retainageHeld;

    struct Milestone {
        uint256 amount;      // gross amount (USDC, 6 decimals)
        uint256 netPayable;  // amount minus retainage
        MilestoneStatus status;
        bytes32 proofHash;   // keccak256 of off-chain proof (inspection report, sign-off, etc.)
        uint64 submittedAt;
        uint64 approvedAt;
        uint64 paidAt;
    }

    Milestone[] public milestones;

    event Funded(address indexed from, uint256 amount);
    event MilestoneCreated(uint256 indexed milestoneId, uint256 amount, uint256 netPayable);
    event MilestoneSubmitted(uint256 indexed milestoneId, bytes32 proofHash);
    event MilestoneApproved(uint256 indexed milestoneId);
    event MilestonePaid(uint256 indexed milestoneId, uint256 netAmount, uint256 retainageAmount);
    event MilestoneDisputed(uint256 indexed milestoneId, string reason);
    event RetainageReleased(uint256 amount);

    modifier onlyDeveloper() {
        require(msg.sender == developer, "Only developer");
        _;
    }

    modifier onlyContractor() {
        require(msg.sender == contractor, "Only contractor");
        _;
    }

    constructor(address _usdc, address _contractor, uint256 _retainageBps, uint256 _retainageReleaseThresholdBps) {
        require(_usdc != address(0), "Invalid USDC");
        require(_contractor != address(0), "Invalid contractor");
        require(_retainageBps <= 2000, "Retainage too high"); // max 20%

        usdc = IERC20(_usdc);
        developer = msg.sender;
        contractor = _contractor;
        retainageBps = _retainageBps;
        retainageReleaseThresholdBps = _retainageReleaseThresholdBps;
    }

    /// @notice Developer deposits USDC into escrow.
    /// @dev Caller must first approve this contract on the USDC token for `amount`.
    function depositFunds(uint256 amount) external onlyDeveloper {
        require(amount > 0, "Amount=0");
        totalDeposited += amount;
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit Funded(msg.sender, amount);
    }

    /// @notice Developer defines a milestone and its gross USDC amount.
    function createMilestone(uint256 amount) external onlyDeveloper returns (uint256 id) {
        require(amount > 0, "Amount=0");

        uint256 r = (amount * retainageBps) / 10000;
        uint256 net = amount - r;

        milestones.push(Milestone({
            amount: amount,
            netPayable: net,
            status: MilestoneStatus.NONE,
            proofHash: bytes32(0),
            submittedAt: 0,
            approvedAt: 0,
            paidAt: 0
        }));

        id = milestones.length - 1;
        emit MilestoneCreated(id, amount, net);
    }

    /// @notice Contractor submits a proof hash (keccak256 of inspection doc, photo set, etc.)
    function submitMilestone(uint256 milestoneId, bytes32 proofHash) external onlyContractor {
        require(milestoneId < milestones.length, "Invalid id");
        require(proofHash != bytes32(0), "Invalid proof");

        Milestone storage m = milestones[milestoneId];
        require(
            m.status == MilestoneStatus.NONE || m.status == MilestoneStatus.DISPUTED,
            "Wrong status"
        );

        m.status = MilestoneStatus.SUBMITTED;
        m.proofHash = proofHash;
        m.submittedAt = uint64(block.timestamp);

        emit MilestoneSubmitted(milestoneId, proofHash);
    }

    /// @notice Developer approves milestone after off-chain verification (PM sign-off, inspector report).
    function approveMilestone(uint256 milestoneId) external onlyDeveloper {
        require(milestoneId < milestones.length, "Invalid id");

        Milestone storage m = milestones[milestoneId];
        require(m.status == MilestoneStatus.SUBMITTED, "Not submitted");

        m.status = MilestoneStatus.APPROVED;
        m.approvedAt = uint64(block.timestamp);

        emit MilestoneApproved(milestoneId);
    }

    /// @notice Release USDC payment for an approved milestone (checks-effects-interactions).
    function payMilestone(uint256 milestoneId) external onlyDeveloper {
        require(milestoneId < milestones.length, "Invalid id");

        Milestone storage m = milestones[milestoneId];
        require(m.status == MilestoneStatus.APPROVED, "Not approved");

        uint256 r = (m.amount * retainageBps) / 10000;
        uint256 net = m.netPayable;

        require(usdc.balanceOf(address(this)) >= net, "Insufficient escrow balance");

        // Checks-Effects-Interactions
        m.status = MilestoneStatus.PAID;
        m.paidAt = uint64(block.timestamp);
        totalPaid += net;
        retainageHeld += r;

        require(usdc.transfer(contractor, net), "Transfer failed");

        emit MilestonePaid(milestoneId, net, r);
    }

    /// @notice Developer disputes a submitted or approved milestone.
    function disputeMilestone(uint256 milestoneId, string calldata reason) external onlyDeveloper {
        require(milestoneId < milestones.length, "Invalid id");

        Milestone storage m = milestones[milestoneId];
        require(
            m.status == MilestoneStatus.SUBMITTED || m.status == MilestoneStatus.APPROVED,
            "Not disputable"
        );

        m.status = MilestoneStatus.DISPUTED;
        emit MilestoneDisputed(milestoneId, reason);
    }

    /// @notice Release all held retainage to contractor at project closeout.
    ///         Requires that a majority threshold of non-disputed milestones are PAID.
    ///         DISPUTED milestones are excluded from the eligible count.
    function releaseRetainage() external onlyDeveloper {
        uint256 total = milestones.length;
        uint256 paidCount = 0;
        uint256 disputedCount = 0;

        for (uint256 i = 0; i < total; i++) {
            if (milestones[i].status == MilestoneStatus.PAID) {
                paidCount++;
            } else if (milestones[i].status == MilestoneStatus.DISPUTED) {
                disputedCount++;
            }
        }

        uint256 eligible = total - disputedCount;
        require(eligible > 0, "No eligible milestones");
        require(
            (paidCount * 10000) / eligible >= retainageReleaseThresholdBps,
            "Threshold not met"
        );

        uint256 amount = retainageHeld;
        require(amount > 0, "No retainage");
        require(usdc.balanceOf(address(this)) >= amount, "Insufficient balance");

        // Checks-Effects-Interactions
        retainageHeld = 0;

        require(usdc.transfer(contractor, amount), "Transfer failed");

        emit RetainageReleased(amount);
    }

    function milestoneCount() external view returns (uint256) {
        return milestones.length;
    }
}
