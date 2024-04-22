// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import "../src/Helper.sol";
import {ArbitrumResolver} from "../src/ArbitrumResolver.sol";

contract OffchainResolverScript is Script, ENSHelper {
    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(privateKey);

        ArbitrumResolver arbResolver = new ArbitrumResolver();

        arbResolver.setText(
            namehash("blockful.eth"),
            "com.twitter",
            "@blockful"
        );

        vm.stopBroadcast();
    }
}
