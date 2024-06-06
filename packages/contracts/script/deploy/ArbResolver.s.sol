// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import "@ens-contracts/utils/UniversalResolver.sol";
import "../Helper.sol";
import "@evmgateway/L1Verifier.sol";
import {Script, console} from "forge-std/Script.sol";
import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";
import {PublicResolver, INameWrapper} from "@ens-contracts/resolvers/PublicResolver.sol";
import {ArbVerifier} from "../../src/ArbVerifier.sol";
import {L2Resolver} from "../../src/L2Resolver.sol";
import {L1Resolver} from "../../src/L1Resolver.sol";
import {IRollupCore} from "@nitro-contracts/src/rollup/IRollupCore.sol";

contract ArbitrumResolverScript is Script, ENSHelper {
    function run() external {
        string memory gatewayUrl = vm.envString("GATEWAY_URL");
        string[] memory urls = new string[](1);
        urls[0] = gatewayUrl;
        address registryAddress = vm.envAddress("REGISTRY_ADDRESS");
        address arbitrumRollupAddress = vm.envAddress("ROLLUP_ADDRESS");
        address arbitrumL2ResolverAddress = vm.envAddress(
            "L2_RESOLVER_ADDRESS"
        );
        address nameWrapperAddress = vm.envAddress("NAME_WRAPPER");
        ENSRegistry registry = ENSRegistry(registryAddress);
        uint256 privateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(privateKey);
        ArbVerifier verifier = new ArbVerifier(
            urls,
            IRollupCore(arbitrumRollupAddress)
        );
        L1Resolver l1resolver = new L1Resolver(
            31137,
            verifier,
            registry,
            INameWrapper(nameWrapperAddress)
        );

        (bytes memory node, ) = NameEncoder.dnsEncodeName("blockful.eth");
        l1resolver.setTarget(node, arbitrumL2ResolverAddress);

        vm.stopBroadcast();
    }
}
