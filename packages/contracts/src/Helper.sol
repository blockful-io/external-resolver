// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

abstract contract ENSHelper {
    bytes32 constant rootNode = 0x0000000000000000000000000000000000000000000000000000000000000000;

    function namehash(string memory _name) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(rootNode, keccak256(abi.encodePacked(_name))));
    }

    function labelhash(string memory _name) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_name));
    }
}
