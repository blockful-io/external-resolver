// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {console} from "forge-std/console.sol";
import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";
import {BaseRegistrarImplementation} from
    "@ens-contracts/ethregistrar/BaseRegistrarImplementation.sol";

import {DeployHelper} from "../DeployHelper.sol";
import {ENSHelper} from "../ENSHelper.sol";

contract BaseRegistrarImplementationScript is DeployHelper, ENSHelper {

    function run() external {
        ENSRegistry registry = ENSRegistry(getContractAddress("ENSRegistry"));

        vm.startBroadcast();

        BaseRegistrarImplementation baseRegistrar =
            new BaseRegistrarImplementation(registry, namehash("eth"));

        // .eth
        registry.setSubnodeOwner(
            rootNode, labelhash("eth"), address(baseRegistrar)
        );

        vm.stopBroadcast();
    }

}
