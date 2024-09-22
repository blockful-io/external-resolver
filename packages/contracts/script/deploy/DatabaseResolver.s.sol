// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";

import {ENSHelper} from "../ENSHelper.sol";
import {DatabaseConfig} from "../config/DatabaseConfig.s.sol";
import {DatabaseResolver} from "../../src/DatabaseResolver.sol";

contract DatabaseResolverScript is Script, ENSHelper {

    function run() external returns (DatabaseResolver) {
        DatabaseConfig config = new DatabaseConfig(block.chainid, msg.sender);
        (
            string memory gatewayUrl,
            string memory graphqlUrl,
            uint32 gatewayTimestamp,
            address[] memory signers,
            /* ENSRegistry */
        ) = config.activeNetworkConfig();

        vm.startBroadcast();
        DatabaseResolver resolver = new DatabaseResolver(
            gatewayUrl, graphqlUrl, gatewayTimestamp, signers
        );
        vm.stopBroadcast();

        return resolver;
    }

}
