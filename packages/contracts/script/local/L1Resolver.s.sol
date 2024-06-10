// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";
import {ReverseRegistrar} from
    "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import {UniversalResolver} from "@ens-contracts/utils/UniversalResolver.sol";
import {NameEncoder} from "@ens-contracts/utils/NameEncoder.sol";
import {PublicResolver} from "@ens-contracts/resolvers/PublicResolver.sol";
import {NameWrapper} from "@ens-contracts/wrapper/NameWrapper.sol";
import {IBaseRegistrar} from "@ens-contracts/ethregistrar/IBaseRegistrar.sol";
import {IMetadataService} from "@ens-contracts/wrapper/IMetadataService.sol";
import {IRollupCore} from "@nitro-contracts/src/rollup/IRollupCore.sol";

import {ENSHelper} from "../Helper.sol";
import {L1Verifier} from "../../src/evmgateway/L1Verifier.sol";
import {L2Resolver} from "../../src/L2Resolver.sol";
import {L1Resolver} from "../../src/L1Resolver.sol";
import {ArbitrumConfig} from "../config/ArbitrumConfig.s.sol";

contract L1ResolverScript is Script, ENSHelper {

    function run() external {
        string[] memory urls = new string[](1);
        urls[0] = "http://127.0.0.1:3000/{sender}/{data}.json";

        ArbitrumConfig config = new ArbitrumConfig(block.chainid);
        (
            ENSRegistry registry,
            , // ReverseRegistrar registrar
            , // UniversalResolver universalResolver
            , // IRollupCore rollup,
            NameWrapper nameWrapper,
            uint256 targetChainId
        ) = config.activeNetworkConfig();

        vm.startBroadcast();

        L1Verifier verifier = new L1Verifier(urls);
        L1Resolver l1resolver =
            new L1Resolver(targetChainId, verifier, registry, nameWrapper);

        // .eth
        registry.setSubnodeRecord(
            rootNode, labelhash("eth"), msg.sender, address(l1resolver), 99999
        );
        // blockful.eth
        registry.setSubnodeRecord(
            namehash("eth"),
            labelhash("blockful"),
            msg.sender,
            address(l1resolver),
            99999
        );

        L2Resolver l2Resolver = new L2Resolver();

        bytes32 node = namehash("blockful.eth");
        l2Resolver.setOwner(node, msg.sender);
        l1resolver.setTarget(node, address(l2Resolver));
        l2Resolver.setText(node, "com.twitter", "@blockful");
        vm.stopBroadcast();
    }

}
