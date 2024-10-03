// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {ReverseRegistrar} from
    "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";

import {DeployHelper} from "../DeployHelper.sol";
import {ENSHelper} from "../ENSHelper.sol";

contract ReverseRegistrarScript is DeployHelper, ENSHelper {

    function run() external {
        ENSRegistry registry = ENSRegistry(getContractAddress("ENSRegistry"));

        vm.startBroadcast();

        ReverseRegistrar reverseRegistrar = new ReverseRegistrar(registry);
        // .reverse
        registry.setSubnodeOwner(rootNode, labelhash("reverse"), msg.sender);
        // addr.reverse
        registry.setSubnodeOwner(
            namehash("reverse"), labelhash("addr"), address(reverseRegistrar)
        );

        vm.stopBroadcast();
    }

}
