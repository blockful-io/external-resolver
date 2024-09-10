// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface OffchainResolver {

    function register(
        string calldata name,
        address owner,
        uint256 duration,
        bytes32 secret,
        address resolver,
        bytes[] calldata data,
        bool reverseRecord,
        uint16 fuses
    )
        external
        payable;

}
