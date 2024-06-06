// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";

import "../Helper.sol";
import {Config} from "./Config.s.sol";
import {DatabaseResolver} from "../../src/DatabaseResolver.sol";

contract DatabaseResolverScript is Script, ENSHelper {
    function run() external returns (DatabaseResolver) {
        address[] memory signers = new address[](0);

        Config config = new Config(block.chainid);
        (string memory gatewayUrl, uint32 gatewayTimestamp) = config.activeNetworkConfig();

        vm.startBroadcast();
        DatabaseResolver resolver = new DatabaseResolver(gatewayUrl, gatewayTimestamp, signers);
        vm.stopBroadcast();

        return resolver;
    }
}
