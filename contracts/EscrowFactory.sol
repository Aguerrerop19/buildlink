// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EscrowVault.sol";

/// @title EscrowFactory - Deploys milestone-based escrow vaults for multiple projects
contract EscrowFactory {
    struct Project {
        address vault;
        address developer;
        address contractor;
        uint256 retainageBps;
        uint64 createdAt;
        string name; // optional label for the project (e.g., "Rivage - Door Package")
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

    /// @notice Create a new escrow vault for a given contractor + retainage
    /// @dev msg.value can optionally pre-fund the vault at creation
    function createProject(
        address contractor,
        uint256 retainageBps,
        string calldata name
    ) external payable returns (address vault, uint256 projectId) {
        EscrowVault v = (new EscrowVault){value: msg.value}(contractor, retainageBps, 8000);

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
