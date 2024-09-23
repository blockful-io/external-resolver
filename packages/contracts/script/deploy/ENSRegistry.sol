// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {console} from "forge-std/console.sol";
import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";

import {DeployHelper} from "../DeployHelper.sol";

contract ENSRegistryScript is DeployHelper {

    function run() external {
        vm.broadcast();
        new ENSRegistry();
    }

}
