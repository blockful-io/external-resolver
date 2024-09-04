// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";

import {ReverseRegistrar} from
    "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";
import {ETHRegistrarController} from
    "@ens-contracts/ethregistrar/ETHRegistrarController.sol";
import {BaseRegistrarImplementation} from
    "@ens-contracts/ethregistrar/BaseRegistrarImplementation.sol";
import {NameWrapper} from "@ens-contracts/wrapper/NameWrapper.sol";
import {StaticMetadataService} from
    "@ens-contracts/wrapper/StaticMetadataService.sol";
import {IMetadataService} from "@ens-contracts/wrapper/IMetadataService.sol";
import {NameEncoder} from "@ens-contracts/utils/NameEncoder.sol";

import {ENSHelper} from "../Helper.sol";
import {L1Verifier} from "../../src/evmgateway/L1Verifier.sol";
import {ArbVerifier} from "../../src/ArbVerifier.sol";
import {L2Resolver} from "../../src/L2Resolver.sol";
import {L1Resolver} from "../../src/L1Resolver.sol";
import {OffchainDomains} from "../../src/interfaces/OffchainDomains.sol";
import {NameWrapperProxy} from "../../src/NameWrapperProxy.sol";

contract L2ArbitrumResolver is Script, ENSHelper {

    function run() external {
        vm.startBroadcast();

        ENSRegistry registry = new ENSRegistry();
        ReverseRegistrar reverseRegistrar = new ReverseRegistrar(registry);
        BaseRegistrarImplementation baseRegistrar =
            new BaseRegistrarImplementation(registry, namehash("arb.eth"));

        // .reverse
        registry.setSubnodeOwner(rootNode, labelhash("reverse"), msg.sender);
        // addr.reverse
        registry.setSubnodeOwner(
            namehash("reverse"), labelhash("addr"), address(reverseRegistrar)
        );
        // .eth
        registry.setSubnodeRecord(
            rootNode, labelhash("eth"), msg.sender, address(0), 100000
        );

        StaticMetadataService metadata =
            new StaticMetadataService("http://localhost:8080");
        NameWrapper nameWrapper = new NameWrapper(
            registry, baseRegistrar, IMetadataService(address(metadata))
        );
        NameWrapperProxy nameWrapperProxy =
            new NameWrapperProxy(namehash("arb.eth"), address(nameWrapper));
        L2Resolver arbResolver =
            new L2Resolver(registry, address(baseRegistrar), nameWrapper);

        nameWrapper.setController(msg.sender, true);
        // arb.eth
        nameWrapper.registerAndWrapETH2LD(
            "arb", msg.sender, 31556952000, address(arbResolver), 0
        );

        // nameWrapper.setApprovalForAll(msg.sender, true);
        // registry.setApprovalForAll(x, true);

        // vm.startBroadcast();
        bytes[] memory data = new bytes[](0);
        nameWrapperProxy.register{value: 0.01 ether}(
            "lucas",
            msg.sender,
            31556952000,
            keccak256("0x"),
            address(arbResolver),
            data,
            false,
            0
        );

        // bytes32 node = namehash("blockful.arb.eth");
        // arbResolver.setAddr(node, msg.sender);
        // arbResolver.setText(
        //     node,
        //     "avatar",
        //     "ipfs://QmdzG4h3KZjcyLsDaVxuFGAjYi7MYN4xxGpU9hwSj1c3CQ" // blockful.jpeg
        // );
        // arbResolver.setText(node, "com.twitter", "@blockful");

        vm.stopBroadcast();

        console.log("nameWrapperProxy deployed at", address(nameWrapperProxy));
        console.log("L2Resolver deployed at", address(arbResolver));
    }

}
