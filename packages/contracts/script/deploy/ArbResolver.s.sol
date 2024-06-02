// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";
import "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import "@ens-contracts/utils/UniversalResolver.sol";
import {PublicResolver, INameWrapper} from "@ens-contracts/resolvers/PublicResolver.sol";

import "../Helper.sol";
import "@evmgateway/L1Verifier.sol";
import {ArbVerifier} from "../../src/ArbVerifier.sol";
import {L2Resolver} from "../../src/L2Resolver.sol";
import {L1Resolver} from "../../src/evmgateway/L1Resolver.sol";
import {IRollupCore} from "@nitro-contracts/src/rollup/IRollupCore.sol";

contract ArbitrumResolverScript is Script, ENSHelper {
    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address publicKey = vm.addr(privateKey);

        string memory gatewayUrl = vm.envString("GATEWAY_URL");
        string[] memory urls = new string[](1);
        urls[0] = gatewayUrl;

        address arbitrumRollupAddress = vm.envAddress("ARBITRUM_ROLLUP_ADDRESS");

        ENSRegistry registry = ENSRegistry(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e);

        vm.startBroadcast(privateKey);
        ArbVerifier verifier = new ArbVerifier(urls, IRollupCore(arbitrumRollupAddress));
        new L1Resolver(verifier, registry, INameWrapper(publicKey));
        vm.stopBroadcast();
    }
}
