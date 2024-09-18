// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {INameWrapper} from "@ens-contracts/wrapper/INameWrapper.sol";
import {Resolver} from "@ens-contracts/resolvers/Resolver.sol";

import {ENSHelper} from "../script/Helper.sol";
import {OffchainResolver} from "./interfaces/OffchainResolver.sol";

contract NameWrapperProxy is OffchainResolver, ENSHelper {

    uint256 public price;
    bytes32 public baseNode;
    INameWrapper nameWrapper;

    constructor(
        bytes32 _baseNode,
        address _nameWrapperAddress,
        uint256 _price
    ) {
        baseNode = _baseNode;
        price = _price;
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
        payable
        override
    {
        bytes32 nodehash =
            keccak256(abi.encodePacked(baseNode, labelhash(name)));

        require(
            nameWrapper.ownerOf(uint256(nodehash)) == address(0),
            "domain already registered"
        );
        require(msg.value >= price, "insufficient funds");

        nameWrapper.setSubnodeRecord(
            baseNode, name, owner, resolver, 0, fuses, uint64(duration)
        );

        if (data.length > 0) {
            Resolver(resolver).multicallWithNodeCheck(nodehash, data);
        }
    }

    function registerParams(
        bytes memory, /* name */
        uint256 /* duration */
    )
        external
        view
        override
        returns (RegisterParams memory)
    {
        return RegisterParams(price);
    }

}
