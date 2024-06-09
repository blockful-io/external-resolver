// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";

import {ReverseRegistrar} from
    "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import {NameEncoder} from "@ens-contracts/utils/NameEncoder.sol";
import {UniversalResolver} from "@ens-contracts/utils/UniversalResolver.sol";
import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";
import {PublicResolver} from "@ens-contracts/resolvers/PublicResolver.sol";
import {IRollupCore} from "@nitro-contracts/src/rollup/IRollupCore.sol";
import {NameWrapper} from "@ens-contracts/wrapper/NameWrapper.sol";

import {ENSHelper} from "../Helper.sol";
import {ArbitrumConfig} from "../config/ArbitrumConfig.s.sol";
import {L1Verifier} from "../../src/evmgateway/L1Verifier.sol";
import {ArbVerifier} from "../../src/ArbVerifier.sol";
import {L2Resolver} from "../../src/L2Resolver.sol";
import {L1Resolver} from "../../src/L1Resolver.sol";

contract ArbitrumResolverScript is Script, ENSHelper {

    function run() external {
        ArbitrumConfig config = new ArbitrumConfig(block.chainid);
        (
            ENSRegistry registry,
            , /* ReverseRegistrar */
            , /* UniversalResolver */
            IRollupCore rollup,
            NameWrapper nameWrapper,
            uint256 targetChainId
        ) = config.activeNetworkConfig();

        string[] memory urls = new string[](1);
        urls[0] = vm.envString("GATEWAY_URL");

        address l2Resolver = vm.envAddress("L2_RESOLVER_ADDRESS");

        vm.startBroadcast();
        ArbVerifier verifier = new ArbVerifier(urls, rollup);
        L1Resolver l1resolver =
            new L1Resolver(targetChainId, verifier, registry, nameWrapper);

        (bytes memory node,) = NameEncoder.dnsEncodeName("blockful.eth");
        l1resolver.setTarget(node, l2Resolver);

        vm.stopBroadcast();
    }

}
