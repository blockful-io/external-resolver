// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {INameWrapper} from "@ens-contracts/wrapper/INameWrapper.sol";
import {Resolver} from "@ens-contracts/resolvers/Resolver.sol";

import {ENSHelper} from "../script/ENSHelper.sol";
import {OffchainRegister} from "./interfaces/OffchainResolver.sol";

contract SubdomainController is OffchainRegister, ENSHelper {

    uint256 public price;
    uint256 public commitTime;
    bytes32 public baseNode;
    INameWrapper nameWrapper;

    constructor(
        bytes32 _baseNode,
        address _nameWrapperAddress,
        uint256 _price,
        uint256 _commitTime
    ) {
        commitTime = _commitTime;
        baseNode = _baseNode;
        price = _price;
        nameWrapper = INameWrapper(_nameWrapperAddress);
    }

    function register(
        bytes32 parentNode,
        string calldata label,
        address owner,
        uint256 duration,     
        bytes32, /* secret */
        address resolver,
        bytes[] calldata data,
        bool, /* reverseRecord */
        uint16 fuses,
        bytes memory /* extraData */
    )
        external
        payable
        override
    {
        bytes32 node = keccak256(abi.encodePacked(parentNode, labelhash(label)));

        require(
            nameWrapper.ownerOf(uint256(node)) == address(0),
            "domain already registered"
        );
        require(msg.value >= price, "insufficient funds");

        nameWrapper.setSubnodeRecord(
            parentNode, label, owner, resolver, 0, fuses, uint64(duration)
        );

        if (data.length > 0) {
            Resolver(resolver).multicallWithNodeCheck(node, data);
        }
    }

}
