// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title EscrowVault - Milestone-based escrow for construction payments (MVP)
contract EscrowVault {
    enum MilestoneStatus { NONE, SUBMITTED, APPROVED, PAID, DISPUTED }

    address public immutable developer;
    address public immutable contractor;

    uint256 public immutable retainageBps; // 500 = 5%
    uint256 public retainageReleaseThresholdBps; // e.g. 8000 = 80%
    uint256 public totalDeposited;
    uint256 public totalPaid;
    uint256 public retainageHeld;

    struct Milestone {
        uint256 amount;          // gross amount
        uint256 netPayable;      // amount minus retainage
        MilestoneStatus status;
        bytes32 proofHash;       // hash of off-chain proof (inspection, delivery, sign-off)
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

    constructor(address _contractor, uint256 _retainageBps, uint256 _retainageReleaseThresholdBps) payable {
        require(_contractor != address(0), "Invalid contractor");
        require(_retainageBps <= 2000, "Retainage too high"); // max 20%

        developer = msg.sender;
        contractor = _contractor;
        retainageBps = _retainageBps;
        retainageReleaseThresholdBps = _retainageReleaseThresholdBps;

        if (msg.value > 0) {
            totalDeposited += msg.value;
            emit Funded(msg.sender, msg.value);
        }
    }

    /// @notice Allow developer to fund escrow any time
    receive() external payable {
        totalDeposited += msg.value;
        emit Funded(msg.sender, msg.value);
    }

    /// @notice Developer defines a milestone amount
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

    /// @notice Contractor submits proof (hash) for a milestone
    function submitMilestone(uint256 milestoneId, bytes32 proofHash) external onlyContractor {
        require(milestoneId < milestones.length, "Invalid id");
        require(proofHash != bytes32(0), "Invalid proof");

        Milestone storage m = milestones[milestoneId];
        require(m.status == MilestoneStatus.NONE || m.status == MilestoneStatus.DISPUTED, "Wrong status");

        m.status = MilestoneStatus.SUBMITTED;
        m.proofHash = proofHash;
        m.submittedAt = uint64(block.timestamp);

        emit MilestoneSubmitted(milestoneId, proofHash);
    }

    /// @notice Developer approves a milestone after verification (oracle / PM sign-off)
    function approveMilestone(uint256 milestoneId) external onlyDeveloper {
        require(milestoneId < milestones.length, "Invalid id");

        Milestone storage m = milestones[milestoneId];
        require(m.status == MilestoneStatus.SUBMITTED, "Not submitted");

        m.status = MilestoneStatus.APPROVED;
        m.approvedAt = uint64(block.timestamp);

        emit MilestoneApproved(milestoneId);
    }

    /// @notice Release payment for an approved milestone
    function payMilestone(uint256 milestoneId) external onlyDeveloper {
        require(milestoneId < milestones.length, "Invalid id");

        Milestone storage m = milestones[milestoneId];
        require(m.status == MilestoneStatus.APPROVED, "Not approved");

        uint256 r = (m.amount * retainageBps) / 10000;
        uint256 net = m.netPayable;

        require(address(this).balance >= net, "Insufficient escrow balance");

        m.status = MilestoneStatus.PAID;
        m.paidAt = uint64(block.timestamp);

        totalPaid += net;
        retainageHeld += r;

        (bool ok, ) = payable(contractor).call{value: net}("");
        require(ok, "Transfer failed");

        emit MilestonePaid(milestoneId, net, r);
    }

    /// @notice Developer can dispute a milestone (simple MVP)
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

    /// @notice Release retainage at project closeout.
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
        require(address(this).balance >= amount, "Insufficient balance");

        retainageHeld = 0;

        (bool ok, ) = payable(contractor).call{value: amount}("");
        require(ok, "Transfer failed");

        emit RetainageReleased(amount);
    }

    function milestoneCount() external view returns (uint256) {
        return milestones.length;
    }
}
