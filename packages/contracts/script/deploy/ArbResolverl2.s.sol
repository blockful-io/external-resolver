// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";

import {ENSHelper} from "../Helper.sol";
import {L2Resolver} from "../../src/L2Resolver.sol";

contract ArbitrumResolverL2Script is Script, ENSHelper {

    function run() external {
        vm.broadcast();
        new L2Resolver();
    }

}
