// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import "../Helper.sol";
import {L1Resolver} from "../../src/L1Resolver.sol";

contract OffchainResolverScript is Script, ENSHelper {
    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(privateKey);
        new L1Resolver();
        vm.stopBroadcast();
    }
}
