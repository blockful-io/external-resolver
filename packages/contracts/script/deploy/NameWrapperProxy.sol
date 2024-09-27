// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";
import {BaseRegistrarImplementation} from
    "@ens-contracts/ethregistrar/BaseRegistrarImplementation.sol";
import {NameWrapper} from "@ens-contracts/wrapper/NameWrapper.sol";

import {DeployHelper} from "../DeployHelper.sol";
import {ENSHelper} from "../ENSHelper.sol";
import {NameWrapperProxy} from "../../src/NameWrapperProxy.sol";

contract NameWrapperProxyScript is DeployHelper, ENSHelper {

    function run() external {
        NameWrapper nameWrapper = NameWrapper(getContractAddress("NameWrapper"));

        vm.startBroadcast();

        uint256 subdomainPrice = 0.001 ether;
        NameWrapperProxy nameWrapperProxy = new NameWrapperProxy(
            namehash("arb.eth"), address(nameWrapper), subdomainPrice, 0
        );
        nameWrapper.setApprovalForAll(address(nameWrapperProxy), true);

        vm.stopBroadcast();
    }

}
