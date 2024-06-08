// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {INameWrapper} from "@ens-contracts/resolvers/PublicResolver.sol";
import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";

import {ENSHelper} from "../Helper.sol";
import {L1Resolver} from "../../src/L1Resolver.sol";
import {L2Resolver} from "../../src/L2Resolver.sol";
import {L1Verifier} from "../../src/evmgateway/L1Verifier.sol";

contract L2ResolverScript is Script, ENSHelper {

    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(privateKey);

        string memory gatewayUrl = vm.envString("GATEWAY_URL");
        address registryAddress = vm.envAddress("REGISTRY_ADDRESS");
        address publicKey = vm.addr(privateKey);
        string[] memory urls = new string[](1);
        urls[0] = gatewayUrl;

        vm.startBroadcast(privateKey);
        ENSRegistry registry = ENSRegistry(registryAddress);
        L1Verifier verifier = new L1Verifier(urls);
        new L1Resolver(31337, verifier, registry, INameWrapper(publicKey));
        new L2Resolver();

        vm.stopBroadcast();
    }

}
