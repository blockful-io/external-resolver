// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";
import {ReverseRegistrar} from
    "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import {UniversalResolver} from "@ens-contracts/utils/UniversalResolver.sol";

import {ENSHelper} from "../Helper.sol";
import {DatabaseConfig} from "../config/DatabaseConfig.s.sol";
import {DatabaseResolver} from "../../src/DatabaseResolver.sol";

contract DatabaseResolverScript is Script, ENSHelper {

    function run() external {
        DatabaseConfig config = new DatabaseConfig(block.chainid);
        (
            string memory gatewayUrl,
            uint32 gatewayTimestamp,
            address[] memory signers,
            ENSRegistry registry
        ) = config.activeNetworkConfig();

        vm.startBroadcast();

        DatabaseResolver resolver =
            new DatabaseResolver(gatewayUrl, gatewayTimestamp, signers);

        // .eth
        registry.setSubnodeRecord(
            rootNode,
            labelhash("eth"),
            msg.sender,
            address(resolver),
            9999999999
        );
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
