// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";

interface IEscrowVaultUSDC {
    function approveMilestone(uint256 milestoneIndex) external;
    function payMilestone(uint256 milestoneIndex) external;
}

interface IEscrowVaultDeveloper {
    function developer() external view returns (address);
}

/// @title BuildLinkFunctionsConsumer
/// @notice Chainlink Functions consumer that bridges off-chain Procore milestone
///         approvals to on-chain BuildLink vault execution on Base Mainnet.
/// @dev Extends FunctionsClient. Admin calls sendRequest() with vault + milestone
///      context. The Chainlink DON fetches the Procore webhook, and fulfillRequest()
///      emits MilestoneVerified when the response is "approved".
contract BuildLinkFunctionsConsumer is FunctionsClient {
    using FunctionsRequest for FunctionsRequest.Request;

    // ── Chainlink config ──────────────────────────────────────────────────────
    // Base Mainnet Functions router: 0xf9B8fc078197181C841c296C876945aaa425B278
    uint64  public constant SUBSCRIPTION_ID    = 143;
    bytes32 public constant DON_ID             = 0x66756e2d626173652d6d61696e6e65742d310000000000000000000000000000;
    uint32  public constant CALLBACK_GAS_LIMIT = 300_000;

    // ── Access control ────────────────────────────────────────────────────────
    address public immutable admin;

    // ── Request tracking ──────────────────────────────────────────────────────
    struct PendingRequest {
        address vault;
        uint256 milestoneIndex;
    }

    mapping(bytes32 => PendingRequest) public pendingRequests;

    bytes32 public latestRequestId;
    bytes   public latestResponse;
    bytes   public latestError;

    // ── Events ────────────────────────────────────────────────────────────────
    // NOTE: FunctionsClient parent emits RequestSent(bytes32 indexed id) and
    //       RequestFulfilled(bytes32 indexed id) automatically. The two events
    //       below are BuildLink-specific additions.
    event MilestoneVerified(address indexed vault, uint256 indexed milestoneIndex);
    event OracleResponse(bytes32 indexed requestId, bytes response, bytes err);
    event ApprovalFailed(address indexed vault, uint256 indexed milestoneIndex);
    event MilestonePaid(address indexed vault, uint256 indexed milestoneIndex);
    event PaymentFailed(address indexed vault, uint256 indexed milestoneIndex);

    // ── Errors ────────────────────────────────────────────────────────────────
    error OnlyAdmin();

    // ── JavaScript executed by the Chainlink DON ──────────────────────────────
    // args[0] = procoreProjectId (string)
    // args[1] = milestoneIndex   (string representation of uint)
    // Returns Functions.encodeString("approved") or Functions.encodeString("rejected")
    string private constant JS_SOURCE =
        "const procoreProjectId = args[0];"
        "const milestoneIndex = args[1];"
        "const proofHash = args[2];"
        "const res = await Functions.makeHttpRequest({"
        "  url: 'https://buildlink-frontend.vercel.app/api/procore/webhook',"
        "  method: 'POST',"
        "  headers: { 'Content-Type': 'application/json' },"
        "  data: { procoreProjectId: procoreProjectId, milestoneIndex: parseInt(milestoneIndex), proofHash: proofHash }"
        "});"
        "if (res.error) throw Error('Webhook request failed: ' + res.message);"
        "const status = res.data && res.data.status ? res.data.status : 'rejected';"
        "return Functions.encodeString(status === 'approved' ? 'approved' : 'rejected');";

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(address _admin)
        FunctionsClient(0xf9B8fc078197181C841c296C876945aaa425B278)
    {
        require(_admin != address(0), "Invalid admin");
        admin = _admin;
    }

    // ── External ──────────────────────────────────────────────────────────────

    /// @notice Send a Chainlink Functions request to verify a Procore milestone.
    ///         The DON will POST to /api/procore/webhook with the proofHash and return
    ///         "approved" or "rejected". On approval, fulfillRequest() calls approveMilestone().
    ///         Callable by admin OR the developer of the target vault.
    /// @param vaultAddress     The BuildLink escrow vault address (USDC)
    /// @param milestoneIndex   The milestone index within the vault
    /// @param procoreProjectId The Procore project identifier (off-chain)
    /// @param proofHash        The milestone's proof hash (hex string, e.g. "0xabc...") — verified by the webhook
    /// @return requestId       The Chainlink Functions request ID
    function sendRequest(
        address vaultAddress,
        uint256 milestoneIndex,
        string calldata procoreProjectId,
        string calldata proofHash
    ) external returns (bytes32 requestId) {
        require(vaultAddress != address(0), "Invalid vault");
        require(
            msg.sender == admin ||
            IEscrowVaultDeveloper(vaultAddress).developer() == msg.sender,
            "Not authorized"
        );

        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(JS_SOURCE);

        string[] memory args = new string[](3);
        args[0] = procoreProjectId;
        args[1] = _uint256ToString(milestoneIndex);
        args[2] = proofHash;
        req.setArgs(args);

        // _sendRequest encodes to CBOR, submits to router, emits RequestSent
        requestId = _sendRequest(
            req.encodeCBOR(),
            SUBSCRIPTION_ID,
            CALLBACK_GAS_LIMIT,
            DON_ID
        );

        pendingRequests[requestId] = PendingRequest({
            vault: vaultAddress,
            milestoneIndex: milestoneIndex
        });

        latestRequestId = requestId;
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    /// @notice Called by the Chainlink DON via handleOracleFulfillment after the
    ///         JS source executes. Parent emits RequestFulfilled after this returns.
    ///         On "approved" response: approveMilestone() → payMilestone() are called
    ///         atomically. If approval succeeds but payment fails, PaymentFailed is emitted
    ///         and the milestone remains in APPROVED state for manual recovery.
    /// @param requestId  The request ID generated by sendRequest()
    /// @param response   Encoded response bytes — "approved" or "rejected"
    /// @param err        Non-empty if execution failed on the DON side
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        latestResponse = response;
        latestError    = err;

        emit OracleResponse(requestId, response, err);

        if (err.length == 0 && keccak256(response) == keccak256(bytes("approved"))) {
            PendingRequest memory pending = pendingRequests[requestId];
            if (pending.vault != address(0)) {
                emit MilestoneVerified(pending.vault, pending.milestoneIndex);
                try IEscrowVaultUSDC(pending.vault).approveMilestone(pending.milestoneIndex) {
                    // Approval succeeded — immediately trigger payment.
                    // fulfillRequest() is called by the DON router which holds no funds;
                    // payMilestone() transfers USDC from the vault to the contractor.
                    try IEscrowVaultUSDC(pending.vault).payMilestone(pending.milestoneIndex) {
                        emit MilestonePaid(pending.vault, pending.milestoneIndex);
                    } catch {
                        emit PaymentFailed(pending.vault, pending.milestoneIndex);
                    }
                } catch {
                    emit ApprovalFailed(pending.vault, pending.milestoneIndex);
                }
            }
        }

        delete pendingRequests[requestId];
    }

    // ── Pure helpers ──────────────────────────────────────────────────────────

    /// @dev Converts a uint256 to its decimal ASCII string, used to pass
    ///      milestoneIndex as a string arg to the Chainlink Functions JS runtime.
    function _uint256ToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
