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
import {ArbitrumConfig} from "../config/ArbitrumConfig.s.sol";

contract arbResolverScript is Script, ENSHelper {

    function run() external {
        uint256 privateKey =
            0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659;

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
        urls[0] = "http://127.0.0.1:3000/{sender}/{data}.json";

        vm.startBroadcast(privateKey);

        ArbVerifier verifier = new ArbVerifier(urls, rollup);
        L1Resolver l1resolver =
            new L1Resolver(targetChainId, verifier, registry, nameWrapper);

        // .eth
        registry.setSubnodeRecord(
            rootNode, labelhash("eth"), msg.sender, address(l1resolver), 100000
        );
        // blockful.eth
        registry.setSubnodeRecord(
            namehash("eth"),
            labelhash("blockful"),
            msg.sender,
            address(l1resolver),
            100000
        );

        l1resolver.setTarget(
            namehash("blockful.eth"), vm.envAddress("L2_RESOLVER_ADDRESS")
        );

        vm.stopBroadcast();
    }

}
