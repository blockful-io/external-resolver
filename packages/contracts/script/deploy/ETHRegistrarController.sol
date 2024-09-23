// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";
import {BaseRegistrarImplementation} from
    "@ens-contracts/ethregistrar/BaseRegistrarImplementation.sol";
import {DummyOracle} from "@ens-contracts/ethregistrar/DummyOracle.sol";
import {
    StablePriceOracle,
    AggregatorInterface
} from "@ens-contracts/ethregistrar/StablePriceOracle.sol";
import {ETHRegistrarController} from
    "@ens-contracts/ethregistrar/ETHRegistrarController.sol";
import {ReverseRegistrar} from
    "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import {NameWrapper} from "@ens-contracts/wrapper/NameWrapper.sol";

import {DeployHelper} from "../DeployHelper.sol";
import {ENSHelper} from "../ENSHelper.sol";

contract ETHRegistrarControllerScript is DeployHelper, ENSHelper {

    function run() external {
        ENSRegistry registry = ENSRegistry(getContractAddress("ENSRegistry"));
        BaseRegistrarImplementation baseRegistrar = BaseRegistrarImplementation(
            getContractAddress("BaseRegistrarImplementation")
        );
        ReverseRegistrar reverseRegistrar =
            ReverseRegistrar(getContractAddress("ReverseRegistrar"));
        NameWrapper nameWrapper = NameWrapper(getContractAddress("NameWrapper"));

        vm.startBroadcast();

        DummyOracle dummyOracle = new DummyOracle(16 gwei);
        uint256[] memory rentPrices = new uint256[](5);
        rentPrices[0] = 5;
        rentPrices[1] = 4;
        rentPrices[2] = 3;
        rentPrices[3] = 2;
        rentPrices[4] = 1;
        StablePriceOracle priceOracle = new StablePriceOracle(
            AggregatorInterface(address(dummyOracle)), rentPrices
        );

        ETHRegistrarController registrarController = new ETHRegistrarController(
            baseRegistrar,
            priceOracle,
            60,
            86400,
            reverseRegistrar,
            nameWrapper,
            registry
        );

        nameWrapper.setController(address(registrarController), true);

        vm.stopBroadcast();
    }

}
