// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";
import {ReverseRegistrar} from
    "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import {UniversalResolver} from "@ens-contracts/utils/UniversalResolver.sol";
import {PublicResolver} from "@ens-contracts/resolvers/PublicResolver.sol";
import {NameWrapper} from "@ens-contracts/wrapper/NameWrapper.sol";
import {IBaseRegistrar} from "@ens-contracts/ethregistrar/IBaseRegistrar.sol";
import {IMetadataService} from "@ens-contracts/wrapper/IMetadataService.sol";

import {ENSHelper} from "../Helper.sol";

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
        registry.setSubnodeOwner(
            rootNode, labelhash("reverse"), address(registrar)
        );
        // addr.reverse
        vm.prank(address(registrar));
        registry.setSubnodeOwner(
            namehash("reverse"), labelhash("addr"), address(registrar)
        );

        NameWrapper nameWrap = new NameWrapper(
            registry,
            IBaseRegistrar(address(registrar)),
            IMetadataService(publicKey)
        );

        PublicResolver resolver = new PublicResolver(
            registry, nameWrap, publicKey, address(registrar)
        );
        registrar.setDefaultResolver(address(resolver));

        // .eth
        registry.setSubnodeRecord(
            rootNode, labelhash("eth"), publicKey, address(resolver), 100000
        );
        // blockful.eth
        registry.setSubnodeRecord(
            namehash("eth"),
            labelhash("blockful"),
            publicKey,
            address(resolver),
            100000
        );

        // inital properties
        resolver.setAddr(namehash("blockful.eth"), publicKey);
        registrar.setName("blockful.eth");
        resolver.setText(
            namehash("blockful.eth"),
            "avatar",
            "ipfs://QmdzG4h3KZjcyLsDaVxuFGAjYi7MYN4xxGpU9hwSj1c3CQ"
        ); // blockful.jpeg
        resolver.setText(namehash("blockful.eth"), "com.twitter", "@blockful");

        vm.stopBroadcast();
    }

}
