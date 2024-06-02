// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import "@ens-contracts/registry/ENSRegistry.sol";
import {INameWrapper} from "@ens-contracts/resolvers/PublicResolver.sol";

import "../Helper.sol";
import "../../src/evmgateway/L1Verifier.sol";
import {L1Resolver} from "../../src/L1Resolver.sol";

contract L1ResolverScript is Script, ENSHelper {
    function run() external {
        string memory gatewayUrl = vm.envString("GATEWAY_URL");
        address registryAddress = vm.envAddress("REGISTRY_ADDRESS");
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address publicKey = vm.addr(privateKey);
        vm.startBroadcast(privateKey);

        string[] memory urls = new string[](1);
        urls[0] = gatewayUrl;

        ENSRegistry registry = ENSRegistry(registryAddress);
        L1Verifier verifier = new L1Verifier(urls);
        new L1Resolver(31337, verifier, registry, INameWrapper(publicKey));

        vm.stopBroadcast();
    }
}
