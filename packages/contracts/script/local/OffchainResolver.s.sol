// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import "@ens-contracts/registry/ENSRegistry.sol";
import "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import "@ens-contracts/utils/UniversalResolver.sol";
import {PublicResolver, INameWrapper} from "@ens-contracts/resolvers/PublicResolver.sol";

import "../Helper.sol";
import "../../src/evmgateway/L1Verifier.sol";
import {L2Resolver} from "../../src/L2Resolver.sol";
import {L1Resolver} from "../../src/evmgateway/L1Resolver.sol";

contract OffchainResolverScript is Script, ENSHelper {
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
        registry.setSubnodeOwner(namehash("reverse"), labelhash("addr"), address(registrar));

        urls[0] = "http://127.0.0.1:3000/{sender}/{data}.json";
        L1Verifier verifier = new L1Verifier(urls);
        L1Resolver l1resolver = new L1Resolver(verifier, registry, INameWrapper(publicKey));

        // .eth
        registry.setSubnodeRecord(rootNode, labelhash("eth"), publicKey, address(l1resolver), 100000);
        // blockful.eth
        registry.setSubnodeRecord(namehash("eth"), labelhash("blockful"), publicKey, address(l1resolver), 100000);

        L2Resolver arbResolver = new L2Resolver();
        bytes32 node = namehash("blockful.eth");
        l1resolver.setTarget(node, address(arbResolver));

        arbResolver.setOwner(node, publicKey);
        arbResolver.setText(node, "com.twitter", "@blockful");

        vm.stopBroadcast();
    }
}
