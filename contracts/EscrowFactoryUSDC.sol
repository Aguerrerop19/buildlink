// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EscrowVaultUSDC.sol";

/// @title EscrowFactoryUSDC - Deploys USDC milestone-based escrow vaults for construction projects.
/// @notice Parallel factory to EscrowFactory (ETH). Does NOT modify the existing ETH system.
///         USDC on Base Mainnet: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
contract EscrowFactoryUSDC {
    address public immutable usdc;

    struct Project {
        address vault;
        address developer;
        address contractor;
        uint256 retainageBps;
        uint64 createdAt;
        string name;
    }

    Project[] public projects;

    event ProjectCreated(
        uint256 indexed projectId,
        address indexed vault,
        address indexed developer,
        address contractor,
        uint256 retainageBps,
        string name
    );

    /// @param _usdc USDC token address.
    ///              Base Mainnet:  0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    ///              Base Sepolia:  0x036CbD53842c5426634e7929541eC2318f3dCF7e
    constructor(address _usdc) {
        require(_usdc != address(0), "Invalid USDC");
        usdc = _usdc;
    }

    /// @notice Create a new USDC escrow vault for a project.
    /// @param contractor  Wallet address of the contractor receiving payments.
    /// @param retainageBps  Retainage in basis points (e.g. 500 = 5%).
    /// @param name  Human-readable project label (e.g. "Rivage Tower - Framing Package").
    function createProject(
        address contractor,
        uint256 retainageBps,
        string calldata name
    ) external returns (address vault, uint256 projectId) {
        EscrowVaultUSDC v = new EscrowVaultUSDC(usdc, contractor, retainageBps, 8000);

        projects.push(Project({
            vault: address(v),
            developer: msg.sender,
            contractor: contractor,
            retainageBps: retainageBps,
            createdAt: uint64(block.timestamp),
            name: name
        }));

        projectId = projects.length - 1;
        vault = address(v);

        emit ProjectCreated(projectId, vault, msg.sender, contractor, retainageBps, name);
    }

    function projectCount() external view returns (uint256) {
        return projects.length;
    }
}
