// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";
import {ReverseRegistrar} from
    "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import {UniversalResolver} from "@ens-contracts/utils/UniversalResolver.sol";

import {ENSHelper} from "../Helper.sol";
import {DatabaseConfig} from "../config/DatabaseConfig.s.sol";
import {DatabaseResolver} from "../../src/DatabaseResolver.sol";

contract DatabaseResolverScript is Script, ENSHelper {

    function run() external {
        DatabaseConfig config = new DatabaseConfig(block.chainid);
        (
            string memory gatewayUrl,
            uint32 gatewayTimestamp,
            address[] memory signers,
            ENSRegistry registry
        ) = config.activeNetworkConfig();

        vm.broadcast();
        DatabaseResolver resolver =
            new DatabaseResolver(gatewayUrl, gatewayTimestamp, signers);

        address owner = registry.owner(namehash("eth"));

        vm.broadcast(owner);
        // blockful.eth
        registry.setSubnodeRecord(
            namehash("eth"),
            labelhash("blockful"),
            0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266,
            address(resolver),
            9999999999
        );
    }

}
