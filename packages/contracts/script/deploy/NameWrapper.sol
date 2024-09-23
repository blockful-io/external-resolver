// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";
import {BaseRegistrarImplementation} from
    "@ens-contracts/ethregistrar/BaseRegistrarImplementation.sol";
import {StaticMetadataService} from
    "@ens-contracts/wrapper/StaticMetadataService.sol";
import {NameWrapper} from "@ens-contracts/wrapper/NameWrapper.sol";
import {IMetadataService} from "@ens-contracts/wrapper/IMetadataService.sol";

import {DeployHelper} from "../DeployHelper.sol";
import {ENSHelper} from "../ENSHelper.sol";

contract NameWrapperScript is DeployHelper, ENSHelper {

    function run() external {
        ENSRegistry registry = ENSRegistry(getContractAddress("ENSRegistry"));
        BaseRegistrarImplementation baseRegistrar = BaseRegistrarImplementation(
            getContractAddress("BaseRegistrarImplementation")
        );

        vm.startBroadcast();

        StaticMetadataService metadata = new StaticMetadataService(
            "http://ens-metadata-service.appspot.com/name/0x{id}"
        );
        NameWrapper nameWrapper = new NameWrapper(
            registry, baseRegistrar, IMetadataService(address(metadata))
        );
        baseRegistrar.addController(address(nameWrapper));
        nameWrapper.setController(msg.sender, true);

        vm.stopBroadcast();
    }

}
