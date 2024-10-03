// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";

import {TextResolver} from "@ens-contracts/resolvers/profiles/TextResolver.sol";
import {ReverseRegistrar} from
    "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";
import {BaseRegistrarImplementation} from
    "@ens-contracts/ethregistrar/BaseRegistrarImplementation.sol";
import {ETHRegistrarController} from
    "@ens-contracts/ethregistrar/ETHRegistrarController.sol";
import {NameWrapper} from "@ens-contracts/wrapper/NameWrapper.sol";
import {PublicResolver} from "@ens-contracts/resolvers/PublicResolver.sol";

import {ENSHelper} from "../ENSHelper.sol";
import {DeployHelper} from "../DeployHelper.sol";
import {SubdomainController} from "../../src/SubdomainController.sol";

contract L2ArbitrumResolver is Script, ENSHelper, DeployHelper {

    function run() external {
        ENSRegistry registry = ENSRegistry(getContractAddress("ENSRegistry"));
        ReverseRegistrar reverseRegistrar =
            ReverseRegistrar(getContractAddress("ReverseRegistrar"));
        NameWrapper nameWrapper = NameWrapper(getContractAddress("NameWrapper"));
        SubdomainController subdomainController =
            SubdomainController(getContractAddress("SubdomainController"));

        vm.startBroadcast();

        PublicResolver arbResolver = new PublicResolver(
            registry,
            nameWrapper,
            address(subdomainController),
            address(reverseRegistrar)
        );

        reverseRegistrar.setDefaultResolver(address(arbResolver));

        // arb.eth
        nameWrapper.registerAndWrapETH2LD(
            "arb", msg.sender, 94670778000, address(arbResolver), 1
        );

        vm.stopBroadcast();

        console.log("Registry deployed at", address(registry));
        console.log("NameWrapper deployed at", address(nameWrapper));
        console.log(
            "SubdomainController deployed at", address(subdomainController)
        );
        console.log("L2Resolver deployed at", address(arbResolver));
    }

}
