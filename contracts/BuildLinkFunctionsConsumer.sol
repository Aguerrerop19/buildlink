// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BuildLinkFunctionsConsumer {

    bytes32 public latestRequestId;
    bytes public latestResponse;

    function mockChainlinkVerification(bytes32 requestId, bytes memory response) external {
        latestRequestId = requestId;
        latestResponse = response;
    }
}
