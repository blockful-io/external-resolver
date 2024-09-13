// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";

import {TextResolver} from "@ens-contracts/resolvers/profiles/TextResolver.sol";
import {ReverseRegistrar} from
    "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";
import {BaseRegistrarImplementation} from
    "@ens-contracts/ethregistrar/BaseRegistrarImplementation.sol";
import {
    StablePriceOracle,
    AggregatorInterface
} from "@ens-contracts/ethregistrar/StablePriceOracle.sol";
import {ETHRegistrarController} from
    "@ens-contracts/ethregistrar/ETHRegistrarController.sol";
import {DummyOracle} from "@ens-contracts/ethregistrar/DummyOracle.sol";
import {NameWrapper} from "@ens-contracts/wrapper/NameWrapper.sol";
import {StaticMetadataService} from
    "@ens-contracts/wrapper/StaticMetadataService.sol";
import {IMetadataService} from "@ens-contracts/wrapper/IMetadataService.sol";
import {PublicResolver} from "@ens-contracts/resolvers/PublicResolver.sol";

import {ENSHelper} from "../Helper.sol";
import {NameWrapperProxy} from "../../src/NameWrapperProxy.sol";

contract L2ArbitrumResolver is Script, ENSHelper {

    function run() external {
        vm.startBroadcast();

        ENSRegistry registry = new ENSRegistry();
        ReverseRegistrar reverseRegistrar = new ReverseRegistrar(registry);
        // .reverse
        registry.setSubnodeOwner(rootNode, labelhash("reverse"), msg.sender);
        // addr.reverse
        registry.setSubnodeOwner(
            namehash("reverse"), labelhash("addr"), address(reverseRegistrar)
        );

        BaseRegistrarImplementation baseRegistrar =
            new BaseRegistrarImplementation(registry, namehash("eth"));

        // .eth
        registry.setSubnodeOwner(
            rootNode, labelhash("eth"), address(baseRegistrar)
        );

        StaticMetadataService metadata = new StaticMetadataService(
            "http://ens-metadata-service.appspot.com/name/0x{id}"
        );
        NameWrapper nameWrapper = new NameWrapper(
            registry, baseRegistrar, IMetadataService(address(metadata))
        );
        baseRegistrar.addController(address(nameWrapper));

        DummyOracle dummyOracle = new DummyOracle(16 gwei);
        uint256[] memory rentPrices = new uint256[](5);
        rentPrices[0] = 5;
        rentPrices[1] = 4;
        rentPrices[2] = 3;
        rentPrices[3] = 2;
        rentPrices[4] = 1;
        StablePriceOracle priceOracle = new StablePriceOracle(
            AggregatorInterface(address(dummyOracle)), rentPrices
        );

        ETHRegistrarController registrarController = new ETHRegistrarController(
            baseRegistrar,
            priceOracle,
            60,
            86400,
            reverseRegistrar,
            nameWrapper,
            registry
        );
        nameWrapper.setController(address(registrarController), true);
        nameWrapper.setController(msg.sender, true);

        NameWrapperProxy nameWrapperProxy =
            new NameWrapperProxy(namehash("arb.eth"), address(nameWrapper));
        nameWrapper.setApprovalForAll(address(nameWrapperProxy), true);

        PublicResolver arbResolver = new PublicResolver(
            registry,
            nameWrapper,
            address(nameWrapperProxy),
            address(reverseRegistrar)
        );

        reverseRegistrar.setDefaultResolver(address(arbResolver));

        // arb.eth
        nameWrapper.registerAndWrapETH2LD(
            "arb", msg.sender, 31556952000, address(arbResolver), 1
        );

        bytes[] memory data = new bytes[](1);
        data[0] = abi.encodeWithSelector(
            TextResolver.setText.selector,
            namehash("blockful.arb.eth"),
            "com.twitter",
            "@blockfu"
        );
        nameWrapperProxy.register(
            "blockful",
            msg.sender,
            31556952000,
            keccak256("secret"),
            address(arbResolver),
            data,
            false,
            0
        );

        vm.stopBroadcast();

        console.log("Registry deployed at", address(registry));
        console.log("NameWrapper deployed at", address(nameWrapper));
        console.log("NameWrapperProxy deployed at", address(nameWrapperProxy));
        console.log("L2Resolver deployed at", address(arbResolver));
    }

}
