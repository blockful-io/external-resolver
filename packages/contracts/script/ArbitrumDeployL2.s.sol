// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";

import "../src/Helper.sol";
import "@ens-contracts/registry/ENSRegistry.sol";
import "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import "@ens-contracts/utils/UniversalResolver.sol";
import {PublicResolver, INameWrapper} from "@ens-contracts/resolvers/PublicResolver.sol";
import {OffchainResolver} from "../src/OffchainResolver.sol";
import {ArbitrumResolver} from "../src/ArbitrumPublicResolver.sol";
import "forge-std/console.sol";

contract PublicResolverScript is Script, ENSHelper {
    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY_ARBITRUM");
        address publicKey = vm.addr(privateKey);
        vm.startBroadcast(privateKey);

        ENSRegistry registry = new ENSRegistry(); // It is here just because of the temporary abitrum's resolver constructor
        string[] memory urls = new string[](1);
        urls[0] = "http://localhost:3000/{sender}/{data}.json";
        UniversalResolver uniResolver = new UniversalResolver(
            address(registry),
            urls
        );
        ReverseRegistrar registrar = new ReverseRegistrar(registry);

        registry.setSubnodeOwner(rootNode, labelhash("reverse"), publicKey);
        registry.setSubnodeOwner(
            namehash("reverse"),
            labelhash("addr"),
            address(registrar)
        );

        ArbitrumResolver resolver = new ArbitrumResolver(registry);
        resolver.setAddr(namehash("layer2.eth"), publicKey);
        resolver.setText(
            namehash("layer2.eth"),
            "avatar",
            "ipfs://QmdzG4h3KZjcyLsDaVxuFGAjYi7MYN4xxGpU9hwSj1c3CQ"
        ); // blockful.jpeg
        resolver.setText(namehash("layer2.eth"), "com.twitter", "@blockful");
        console.logAddress(address(resolver));

        vm.stopBroadcast();
    }
}
