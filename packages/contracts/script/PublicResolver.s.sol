// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";

import "../src/Helper.sol";
import "@ens-contracts/registry/ENSRegistry.sol";
import "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import "@ens-contracts/utils/UniversalResolver.sol";
import {PublicResolver, INameWrapper} from "@ens-contracts/resolvers/PublicResolver.sol";
import {OffchainResolver} from "../src/OffchainResolver.sol";

contract PublicResolverScript is Script, ENSHelper {
    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address publicKey = vm.addr(privateKey);
        vm.startBroadcast(privateKey);

        ENSRegistry registry = new ENSRegistry();
        string[] memory urls = new string[](1);
        urls[0] = "http://localhost:3000/{sender}/{data}.json";
        new UniversalResolver(address(registry), urls);
        ReverseRegistrar registrar = new ReverseRegistrar(registry);

        // .reverse
        registry.setSubnodeOwner(rootNode, labelhash("reverse"), publicKey);
        // addr.reverse
        registry.setSubnodeOwner(
            namehash("reverse"),
            labelhash("addr"),
            address(registrar)
        );

        PublicResolver resolver = new PublicResolver(
            registry,
            INameWrapper(publicKey),
            publicKey,
            address(registrar)
        );
        registrar.setDefaultResolver(address(resolver));

        address[] memory t = new address[](1);
        t[0] = 0x06b0e4af848d3EB6A44517e8ebca54fD220ca91b;

        OffchainResolver off_resolver = new OffchainResolver(
            "http://localhost:3000/{sender}/{data}.json",
            t
        );

        // .eth
        registry.setSubnodeRecord(
            rootNode,
            labelhash("eth"),
            publicKey,
            address(off_resolver),
            100000
        );
        // public.eth
        registry.setSubnodeRecord(
            namehash("eth"),
            labelhash("public"),
            publicKey,
            address(off_resolver),
            100000
        );

        // inital properties
        resolver.setAddr(namehash("public.eth"), publicKey);
        registrar.setName("public.eth");
        resolver.setText(
            namehash("public.eth"),
            "avatar",
            "ipfs://QmdzG4h3KZjcyLsDaVxuFGAjYi7MYN4xxGpU9hwSj1c3CQ"
        ); // blockful.jpeg

        vm.stopBroadcast();
    }
}
