// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";

import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";
import {ReverseRegistrar} from
    "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import {NameWrapper} from "@ens-contracts/wrapper/NameWrapper.sol";
import {IBaseRegistrar} from "@ens-contracts/ethregistrar/IBaseRegistrar.sol";
import {BaseRegistrarImplementation} from
    "@ens-contracts/ethregistrar/BaseRegistrarImplementation.sol";
import {IMetadataService} from "@ens-contracts/wrapper/IMetadataService.sol";
import {UniversalResolver} from "@ens-contracts/utils/UniversalResolver.sol";

import {ENSHelper} from "../ENSHelper.sol";

contract DatabaseConfig is Script, ENSHelper {

    NetworkConfig private _activeNetworkConfig;

    struct NetworkConfig {
        string gatewayUrl;
        string metadataUrl;
        uint32 gatewayTimestamp;
        address[] signers;
        ENSRegistry registry;
    }

    constructor(uint256 chainId, address sender) {
        if (chainId == 11155111) _activeNetworkConfig = _getSepoliaConfig();
        else if (chainId == 1) _activeNetworkConfig = _getMainnetConfig();
        else _activeNetworkConfig = _getAnvilConfig(sender);
    }

    function activeNetworkConfig()
        public
        view
        returns (
            string memory gatewayUrl,
            string memory metadataUrl,
            uint32 gatewayTimestamp,
            address[] memory signers,
            ENSRegistry registry
        )
    {
        return (
            _activeNetworkConfig.gatewayUrl,
            _activeNetworkConfig.metadataUrl,
            _activeNetworkConfig.gatewayTimestamp,
            _activeNetworkConfig.signers,
            _activeNetworkConfig.registry
        );
    }

    function _getMainnetConfig() private view returns (NetworkConfig memory) {
        address[] memory signers = new address[](1);
        signers[0] = vm.envAddress("GATEWAY_ADDRESS");
        return NetworkConfig({
            gatewayUrl: vm.envString("GATEWAY_URL"),
            metadataUrl: vm.envString("METADATA_URL"),
            gatewayTimestamp: 600,
            signers: signers,
            registry: ENSRegistry(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e)
        });
    }

    function _getSepoliaConfig() private view returns (NetworkConfig memory) {
        address[] memory signers = new address[](1);
        signers[0] = vm.envAddress("GATEWAY_ADDRESS");
        return NetworkConfig({
            gatewayUrl: vm.envString("GATEWAY_URL"),
            metadataUrl: vm.envString("METADATA_URL"),
            gatewayTimestamp: 600,
            signers: signers,
            registry: ENSRegistry(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e)
        });
    }

    function _getAnvilConfig(address sender)
        private
        returns (NetworkConfig memory)
    {
        if (address(_activeNetworkConfig.registry) != address(0)) {
            return _activeNetworkConfig;
        }

        address[] memory signers = new address[](1);
        signers[0] = sender;
        string[] memory urls = new string[](1);
        urls[0] = "http://127.0.0.1:3000/{sender}/{data}.json";

        vm.startBroadcast(sender);
        ENSRegistry registry = new ENSRegistry();
        UniversalResolver universalResolver =
            new UniversalResolver(address(registry), urls);
        BaseRegistrarImplementation baseRegistar =
            new BaseRegistrarImplementation(registry, namehash("eth"));

        ReverseRegistrar registrar = new ReverseRegistrar(registry);

        // .reverse
        registry.setSubnodeOwner(rootNode, labelhash("reverse"), sender);

        // addr.reverse
        registry.setSubnodeOwner(
            namehash("reverse"), labelhash("addr"), address(registrar)
        );

        vm.stopBroadcast();

        console.log("Registry deployed at", address(registry));
        console.log("UniversalResolver deployed at", address(universalResolver));
        console.log("BaseRegistrar deployed at", address(baseRegistar));

        return NetworkConfig({
            gatewayUrl: urls[0],
            metadataUrl: "https://127.0.0.1:3000",
            gatewayTimestamp: 600,
            signers: signers,
            registry: registry
        });
    }

}
