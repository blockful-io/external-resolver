// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {INameWrapper} from "@ens-contracts/wrapper/INameWrapper.sol";
import {Resolver} from "@ens-contracts/resolvers/Resolver.sol";

import {ENSHelper} from "../script/Helper.sol";
import {OffchainResolver} from "./interfaces/OffchainResolver.sol";

contract NameWrapperProxy is OffchainResolver, ENSHelper {

    bytes32 baseNode;
    INameWrapper nameWrapper;

    constructor(bytes32 _baseNode, address _nameWrapperAddress) {
        baseNode = _baseNode;
        nameWrapper = INameWrapper(_nameWrapperAddress);
    }

    function register(
        string calldata name,
        address owner,
        uint256 duration,
        bytes32, /* secret */
        address resolver,
        bytes[] calldata data,
        bool, /* reverseRecord */
        uint16 fuses
    )
        external
        override
    {
        nameWrapper.setSubnodeRecord(
            baseNode, name, owner, resolver, 0, fuses, uint64(duration)
        );

        if (data.length > 0) {
            bytes32 nodehash =
                keccak256(abi.encodePacked(baseNode, labelhash(name)));
            Resolver(resolver).multicallWithNodeCheck(nodehash, data);
        }
    }

}
