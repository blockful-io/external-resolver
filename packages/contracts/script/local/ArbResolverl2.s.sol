// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";

import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";
import {ReverseRegistrar} from
    "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import {UniversalResolver} from "@ens-contracts/utils/UniversalResolver.sol";
import {PublicResolver} from "@ens-contracts/resolvers/PublicResolver.sol";
import {IRollupCore} from "@nitro-contracts/src/rollup/IRollupCore.sol";

import {ENSHelper} from "../Helper.sol";
import {L1Verifier} from "../../src/evmgateway/L1Verifier.sol";
import {ArbVerifier} from "../../src/ArbVerifier.sol";
import {L2Resolver} from "../../src/L2Resolver.sol";
import {L1Resolver} from "../../src/L1Resolver.sol";

contract arbResolverL2Script is Script, ENSHelper {

    function run() external {
        vm.startBroadcast();

        L2Resolver arbResolver = new L2Resolver();
        bytes32 node = namehash("blockful.eth");

        arbResolver.setOwner(node, msg.sender);
        arbResolver.setAddr(node, msg.sender);
        arbResolver.setText(
            node,
            "avatar",
            "ipfs://QmdzG4h3KZjcyLsDaVxuFGAjYi7MYN4xxGpU9hwSj1c3CQ" // blockful.jpeg
        );
        arbResolver.setText(node, "com.twitter", "@blockful");

        vm.stopBroadcast();
    }

}
