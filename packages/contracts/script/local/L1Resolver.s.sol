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

import {ENSHelper} from "../Helper.sol";
import {L1Verifier} from "../../src/evmgateway/L1Verifier.sol";
import {L2Resolver} from "../../src/L2Resolver.sol";
import {L1Resolver} from "../../src/L1Resolver.sol";

contract L1ResolverScript is Script, ENSHelper {

    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address publicKey = vm.addr(privateKey);
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

        NameWrapper nameWrap = new NameWrapper(
            registry,
            IBaseRegistrar(address(registrar)),
            IMetadataService(publicKey)
        );

        L1Verifier verifier = new L1Verifier(urls);
        L1Resolver l1resolver =
            new L1Resolver(block.chainid, verifier, registry, nameWrap);

        // .eth
        registry.setSubnodeRecord(
            rootNode,
            labelhash("eth"),
            publicKey,
            address(l1resolver),
            9999999999
        );
        // blockful.eth
        registry.setSubnodeRecord(
            namehash("eth"),
            labelhash("blockful"),
            publicKey,
            address(l1resolver),
            9999999999
        );

        L2Resolver l2Resolver = new L2Resolver();
        (bytes memory dnsNode,) = NameEncoder.dnsEncodeName("blockful.eth");
        l1resolver.setTarget(dnsNode, address(l2Resolver));

        bytes32 node = namehash("blockful.eth");
        l2Resolver.setOwner(node, publicKey);
        l2Resolver.setText(node, "com.twitter", "@blockful");

        vm.stopBroadcast();
    }

}
