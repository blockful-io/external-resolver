// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";

import "../src/Helper.sol";
import "@ens-contracts/registry/ENSRegistry.sol";
import "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import "@ens-contracts/utils/UniversalResolver.sol";
import {PublicResolver, INameWrapper} from "@ens-contracts/resolvers/PublicResolver.sol";

contract PublicResolverScript is Script, ENSHelper {
    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address publicKey = vm.addr(privateKey);
        vm.startBroadcast(privateKey);

        ENSRegistry registry = new ENSRegistry();
        string[] memory urls = new string[](1);
        urls[0] = "localhost:8080";
        UniversalResolver universalResolver = new UniversalResolver(address(registry), urls);
        ReverseRegistrar registrar = new ReverseRegistrar(registry);

        // .reverse
        registry.setSubnodeOwner(rootNode, labelhash("reverse"), publicKey);
        // addr.reverse
        registry.setSubnodeOwner(namehash("reverse"), labelhash("addr"), address(registrar));

        PublicResolver resolver = new PublicResolver(registry, INameWrapper(publicKey), publicKey, address(registrar));
        registrar.setDefaultResolver(address(resolver));

        // .eth
        registry.setSubnodeRecord(rootNode, labelhash("eth"), publicKey, address(resolver), 100000);
        // public.eth
        registry.setSubnodeRecord(namehash("eth"), labelhash("public"), publicKey, address(resolver), 100000);

        console.logBytes32(namehash("eth"));
        console.logBytes32(labelhash("eth"));
        console.logBytes32(namehash("public.eth"));

        // inital properties
        resolver.setAddr(namehash("public.eth"), address(1));
        resolver.setText(namehash("public.eth"), "avatar", "blockful.png");

        string memory text = resolver.text(namehash("public.eth"), "avatar");
        console.logString(text);

        vm.stopBroadcast();
    }
}
