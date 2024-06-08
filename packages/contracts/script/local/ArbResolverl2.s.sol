// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@ens-contracts/registry/ENSRegistry.sol";
import "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import "@ens-contracts/utils/UniversalResolver.sol";
import "../Helper.sol";
import "../../src/evmgateway/L1Verifier.sol";
import {
    PublicResolver,
    INameWrapper
} from "@ens-contracts/resolvers/PublicResolver.sol";
import {Script, console} from "forge-std/Script.sol";
import {IRollupCore} from "@nitro-contracts/src/rollup/IRollupCore.sol";
import {ArbVerifier} from "../../src/ArbVerifier.sol";
import {L2Resolver} from "../../src/L2Resolver.sol";
import {L1Resolver} from "../../src/L1Resolver.sol";

contract arbResolverL2Script is Script, ENSHelper {

    function run() external {
        uint256 privateKey =
            0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659;
        address publicKey = vm.addr(privateKey);
        vm.startBroadcast(privateKey);

        L2Resolver arbResolver = new L2Resolver();
        bytes32 node = namehash("blockful.eth");

        arbResolver.setOwner(node, publicKey);
        arbResolver.setAddr(node, publicKey);
        arbResolver.setText(
            node,
            "avatar",
            "ipfs://QmdzG4h3KZjcyLsDaVxuFGAjYi7MYN4xxGpU9hwSj1c3CQ"
        ); // blockful.jpeg
        arbResolver.setText(node, "com.twitter", "@blockful");

        vm.stopBroadcast();
    }

}
