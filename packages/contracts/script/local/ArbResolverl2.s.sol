// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import "@ens-contracts/registry/ENSRegistry.sol";
import "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import "@ens-contracts/utils/UniversalResolver.sol";
import {PublicResolver, INameWrapper} from "@ens-contracts/resolvers/PublicResolver.sol";

import "../Helper.sol";
import "../../src/evmgateway/L1Verifier.sol";
import {ArbVerifier} from "../../src/ArbVerifier.sol";
import {L2Resolver} from "../../src/L2Resolver.sol";
import {L1Resolver} from "../../src/evmgateway/L1Resolver.sol";
import {IRollupCore} from "@nitro-contracts/src/rollup/IRollupCore.sol";

contract OffchainResolverScript is Script, ENSHelper {
    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address publicKey = vm.addr(privateKey);
        vm.startBroadcast(privateKey);

        L2Resolver arbResolver = new L2Resolver();
        bytes32 node = namehash("blockful.eth");

        arbResolver.setOwner(node, publicKey);
        arbResolver.setAddr(namehash("blockful.eth"), publicKey);
        arbResolver.setText(
            namehash("blockful.eth"),
            "avatar",
            "ipfs://QmdzG4h3KZjcyLsDaVxuFGAjYi7MYN4xxGpU9hwSj1c3CQ"
        ); // blockful.jpeg

        arbResolver.setText(
            namehash("blockful.eth"),
            "com.twitter",
            "@blockful"
        );
        vm.stopBroadcast();
    }
}
