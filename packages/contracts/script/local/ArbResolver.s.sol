// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

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
import {Script, console} from "forge-std/Script.sol";

contract arbResolverScript is Script, ENSHelper {

    function run() external {
        uint256 privateKey =
            0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659;
        address publicKey = vm.addr(privateKey);
        address arbitrumRollupAddress =
            0x3fC2B5464aD073036fEA6e396eC2Ac0406A3b058;
        address arbitrumL2ResolverAddress =
            0x0702AA6Ec5fbC66a4CcdDaaa9B29CB667F6528e3;

        vm.startBroadcast(privateKey);

        ENSRegistry registry = new ENSRegistry();
        string[] memory urls = new string[](1);
        urls[0] = "http://127.0.0.1:3000/{sender}/{data}.json";
        new UniversalResolver(address(registry), urls);

        ReverseRegistrar registrar = new ReverseRegistrar(registry);

        // .reverse
        registry.setSubnodeOwner(rootNode, labelhash("reverse"), publicKey);
        // addr.reverse
        registry.setSubnodeOwner(
            namehash("reverse"), labelhash("addr"), address(registrar)
        );

        ArbVerifier verifier =
            new ArbVerifier(urls, IRollupCore(arbitrumRollupAddress));

        NameWrapper nameWrap = new NameWrapper(
            registry,
            IBaseRegistrar(address(registrar)),
            IMetadataService(publicKey)
        );

        L1Resolver l1resolver =
            new L1Resolver(1337, verifier, registry, nameWrap);

        // .eth
        registry.setSubnodeRecord(
            rootNode, labelhash("eth"), publicKey, address(l1resolver), 100000
        );
        // blockful.eth
        registry.setSubnodeRecord(
            namehash("eth"),
            labelhash("blockful"),
            publicKey,
            address(l1resolver),
            100000
        );

        (bytes memory node,) = NameEncoder.dnsEncodeName("blockful.eth");
        l1resolver.setTarget(node, arbitrumL2ResolverAddress);

        vm.stopBroadcast();
    }

}
