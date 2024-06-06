// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@ens-contracts/registry/ENSRegistry.sol";
import "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import "@ens-contracts/ethregistrar/IBaseRegistrar.sol";
import "@ens-contracts/utils/UniversalResolver.sol";
import "../Helper.sol";
import "@evmgateway/L1Verifier.sol";
import {PublicResolver, INameWrapper} from "@ens-contracts/resolvers/PublicResolver.sol";
import {NameWrapper} from "@ens-contracts/wrapper/NameWrapper.sol";
import {IRollupCore} from "@nitro-contracts/src/rollup/IRollupCore.sol";
import {IMetadataService} from "@ens-contracts/wrapper/IMetadataService.sol";
import {ArbVerifier} from "../../src/ArbVerifier.sol";
import {L2Resolver} from "../../src/L2Resolver.sol";
import {L1Resolver} from "../../src/L1Resolver.sol";
import {Script, console} from "forge-std/Script.sol";

contract arbResolverScript is Script, ENSHelper {
    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address publicKey = vm.addr(privateKey);
        address arbitrumRollupAddress = vm.envAddress("ROLLUP_ADDRESS");
        address arbitrumL2ResolverAddress = vm.envAddress(
            "L2_RESOLVER_ADDRESS"
        );

        vm.startBroadcast(privateKey);

        ENSRegistry registry = new ENSRegistry();
        string[] memory urls = new string[](1);
        urls[0] = "http://127.0.0.1:3000/{sender}/{data}.json";
        new UniversalResolver(address(registry), urls);

        // .reverse
        ReverseRegistrar registrar = new ReverseRegistrar(registry);
        address registrarAddress = address(registrar);

        // .reverse
        registry.setSubnodeOwner(rootNode, labelhash("reverse"), publicKey);
        // addr.reverse
        registry.setSubnodeOwner(
            namehash("reverse"),
            labelhash("addr"),
            registrarAddress
        );

        ArbVerifier verifier = new ArbVerifier(
            urls,
            IRollupCore(arbitrumRollupAddress)
        );

        NameWrapper nameWrap = new NameWrapper(
            registry,
            IBaseRegistrar(registrarAddress),
            IMetadataService(publicKey)
        );

        L1Resolver l1resolver = new L1Resolver(
            31337,
            verifier,
            registry,
            nameWrap
        );

        // .eth
        registry.setSubnodeRecord(
            rootNode,
            labelhash("eth"),
            publicKey,
            address(l1resolver),
            100000
        );
        // blockful.eth
        registry.setSubnodeRecord(
            namehash("eth"),
            labelhash("blockful"),
            publicKey,
            address(l1resolver),
            100000
        );

        (bytes memory node, ) = NameEncoder.dnsEncodeName("blockful.eth");
        l1resolver.setTarget(node, arbitrumL2ResolverAddress);

        vm.stopBroadcast();
    }
}
