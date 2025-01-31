// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";

import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";
import {ReverseRegistrar} from
    "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import {IRollupCore} from "@nitro-contracts/src/rollup/IRollupCore.sol";

import {ENSHelper} from "../ENSHelper.sol";
import {L1Verifier} from "@evmgateway/L1Verifier.sol";
import {ArbitrumVerifier} from "../../src/ArbitrumVerifier.sol";
import {L1Resolver} from "../../src/L1Resolver.sol";
import {L1ArbitrumConfig} from "../config/L1ArbitrumConfig.s.sol";

contract L1ArbitrumResolverScript is Script, ENSHelper {

    function run() external {
        (
            ENSRegistry registry,
            IRollupCore rollup,
            uint256 targetChainId,
            address l2Resolver,
            address l2Registrar,
            address l2NameWrapper
        ) = (new L1ArbitrumConfig(block.chainid, msg.sender))
            .activeNetworkConfig();

        console.log("L2Registrar", l2Registrar);
        console.log("L2Resolver", l2Resolver);

        string[] memory urls = new string[](1);
        urls[0] = "http://127.0.0.1:3000/{sender}/{data}.json";

        string memory metadataUrl = "https://localhost:3000";

        vm.startBroadcast();

        ArbitrumVerifier verifier = new ArbitrumVerifier(urls, rollup);
        L1Resolver l1resolver = new L1Resolver(
            targetChainId,
            l2Resolver,
            l2Registrar,
            l2NameWrapper,
            verifier,
            metadataUrl
        );

        // .eth
        registry.setSubnodeOwner(rootNode, labelhash("eth"), msg.sender);
        // arb.eth
        registry.setSubnodeRecord(
            namehash("eth"),
            labelhash("arb"),
            msg.sender,
            address(l1resolver),
            100000
        );

        vm.stopBroadcast();

        console.log("L1Resolver deployed at", address(l1resolver));
    }

}
