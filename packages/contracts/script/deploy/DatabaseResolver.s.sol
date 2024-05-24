// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";

import "../Helper.sol";
import {DatabaseResolver} from "../../src/DatabaseResolver.sol";

contract DatabaseResolverScript is Script, ENSHelper {
    function run() external {
        string memory gatewayUrl = vm.envString("GATEWAY_URL");
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address publicKey = vm.addr(privateKey);
        vm.startBroadcast(privateKey);

        address[] memory signers = new address[](1);
        signers[0] = publicKey;
        new DatabaseResolver(gatewayUrl, 600, signers);

        vm.stopBroadcast();
    }
}
