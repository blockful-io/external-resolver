// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "../lib/forge-std/src/Script.sol";
import "../lib/forge-std/src/console.sol";

import "../src/Helper.sol";
import "@ens-contracts/registry/ENSRegistry.sol";
import "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import "@ens-contracts/utils/UniversalResolver.sol";
import {PublicResolver, INameWrapper} from "@ens-contracts/resolvers/PublicResolver.sol";
import {OffchainResolver} from "../src/OffchainResolver.sol";

contract OffchainResolverScript is Script, ENSHelper {
    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address publicKey = vm.addr(privateKey);
        vm.startBroadcast(privateKey);
        address[] memory t = new address[](1);

        OffchainResolver resolver = new OffchainResolver(
            "https://gateway.com",
            t
        );

        vm.stopBroadcast();
    }
}
