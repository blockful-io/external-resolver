// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import "../Helper.sol";
import {L2Resolver} from "../../src/L2Resolver.sol";

contract L2ResolverScript is Script, ENSHelper {
    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(privateKey);
        new L2Resolver();
        vm.stopBroadcast();
    }
}
