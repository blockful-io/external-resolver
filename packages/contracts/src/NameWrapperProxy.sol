// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "forge-std/console.sol";

import {INameWrapper} from "@ens-contracts/wrapper/INameWrapper.sol";

import {ENSHelper} from "../script/Helper.sol";
import {OffchainDomains} from "./interfaces/OffchainDomains.sol";

contract NameWrapperProxy is OffchainDomains, ENSHelper {

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
        bytes[] calldata, /* data */
        bool, /* reverseRecord */
        uint16 fuses
    )
        external
        payable
        override
    {
        // (bytes32 labelhash,) = keccak256(name).readLabel(0);
        // bytes32 parentNode = name.namehash(offset);
        // bytes32 node = makeNode(baseNode, labelhash);

        // bytes32 node = keccak256("2");
        // bytes32 subnameNode = keccak256(bytes(name));
        // console.log("subnameNode");
        // console.logBytes32(subnameNode);
        // require(
        //     nameWrapper.ownerOf(uint256(subnameNode)) == address(0),
        //     "Subname is not available"
        // );

        nameWrapper.setSubnodeRecord(
            baseNode, name, owner, resolver, uint64(duration), fuses, 0
        );
    }

}
