// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";

import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";
import {ReverseRegistrar} from
    "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import {IBaseRegistrar} from "@ens-contracts/ethregistrar/IBaseRegistrar.sol";
import {UniversalResolver} from "@ens-contracts/utils/UniversalResolver.sol";
import {NameEncoder} from "@ens-contracts/utils/NameEncoder.sol";
import {PublicResolver} from "@ens-contracts/resolvers/PublicResolver.sol";
import {NameWrapper} from "@ens-contracts/wrapper/NameWrapper.sol";
import {IRollupCore} from "@nitro-contracts/src/rollup/IRollupCore.sol";
import {IMetadataService} from "@ens-contracts/wrapper/IMetadataService.sol";

import {ENSHelper} from "../Helper.sol";
import {L1Verifier} from "@evmgateway/L1Verifier.sol";
import {ArbVerifier} from "../../src/ArbVerifier.sol";
import {L2Resolver} from "../../src/L2Resolver.sol";
import {L1Resolver} from "../../src/L1Resolver.sol";
import {L1ArbitrumConfig} from "../config/L1ArbitrumConfig.s.sol";

contract L1ArbitrumResolverScript is Script, ENSHelper {

    function run() external {
        (
            ENSRegistry registry,
            IRollupCore rollup,
            uint256 targetChainId,
            address l2Resolver,
            address l2Registrar
        ) = (new L1ArbitrumConfig(block.chainid, msg.sender))
            .activeNetworkConfig();

        string[] memory urls = new string[](1);
        urls[0] = "http://127.0.0.1:3000/{sender}/{data}.json";

        vm.startBroadcast();

        ArbVerifier verifier = new ArbVerifier(urls, rollup);
        L1Resolver l1resolver =
            new L1Resolver(targetChainId, l2Resolver, l2Registrar, verifier);

        console.log("L1Resolver deployed at", address(l1resolver));

        // .eth
        registry.setSubnodeRecord(
            rootNode, labelhash("eth"), msg.sender, address(0x123), 1000000
        );
        // arb.eth
        registry.setSubnodeRecord(
            namehash("eth"),
            labelhash("arb"),
            msg.sender,
            address(l1resolver),
            100000
        );

        vm.stopBroadcast();
    }

}
