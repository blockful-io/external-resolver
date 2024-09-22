// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";

import {ENSHelper} from "../ENSHelper.sol";
import {DatabaseConfig} from "../config/DatabaseConfig.s.sol";
import {DatabaseResolver} from "../../src/DatabaseResolver.sol";

contract DatabaseResolverScript is Script, ENSHelper {

    function run() external {
        DatabaseConfig config = new DatabaseConfig(block.chainid, msg.sender);
        (
            string memory gatewayUrl,
            string memory metadataUrl,
            uint32 gatewayTimestamp,
            address[] memory signers,
            ENSRegistry registry
        ) = config.activeNetworkConfig();

        vm.broadcast();
        DatabaseResolver resolver = new DatabaseResolver(
            gatewayUrl, metadataUrl, gatewayTimestamp, signers
        );

        vm.startBroadcast();

        // .eth
        registry.setSubnodeOwner(rootNode, labelhash("eth"), msg.sender);
        // blockful.eth
        registry.setSubnodeRecord(
            namehash("eth"),
            labelhash("blockful"),
            msg.sender,
            address(resolver),
            9999999999
        );
        vm.stopBroadcast();
    }

}
