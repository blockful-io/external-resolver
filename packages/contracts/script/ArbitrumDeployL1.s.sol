// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";

import "../src/Helper.sol";
import "@ens-contracts/registry/ENSRegistry.sol";
import "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import "@ens-contracts/utils/UniversalResolver.sol";
import {PublicResolver, INameWrapper} from "@ens-contracts/resolvers/PublicResolver.sol";
import {OffchainResolver} from "../src/ArbitrumOffchainResolver.sol";
import "forge-std/console.sol";

contract PublicResolverScript is Script, ENSHelper {
    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY_ARBITRUM");
        address publicKey = vm.addr(privateKey);
        vm.startBroadcast(privateKey);

        ENSRegistry registry = new ENSRegistry();
        string[] memory urls = new string[](1);
        urls[0] = "http://localhost:3000/{sender}/{data}.json";
        UniversalResolver uniResolver = new UniversalResolver(
            address(registry),
            urls
        );
        ReverseRegistrar registrar = new ReverseRegistrar(registry);
        console.logAddress(address(uniResolver));
        // .reverse
        registry.setSubnodeOwner(rootNode, labelhash("reverse"), publicKey);
        // addr.reverse
        registry.setSubnodeOwner(
            namehash("reverse"),
            labelhash("addr"),
            address(registrar)
        );

        address[] memory t = new address[](1);
        t[0] = 0x06b0e4af848d3EB6A44517e8ebca54fD220ca91b;

        OffchainResolver off_resolver = new OffchainResolver(
            "http://localhost:3000/{sender}/{data}.json",
            // "http://localhost:3000/",
            t
        );

        console.logString("Offchain address: ");
        console.logAddress(address(off_resolver));

        registry.setSubnodeRecord(
            rootNode,
            labelhash("eth"),
            publicKey,
            address(off_resolver),
            100000
        );
        registry.setSubnodeRecord(
            namehash("eth"),
            labelhash("layer2"),
            publicKey,
            address(off_resolver),
            100000
        );

        vm.stopBroadcast();
    }
}
