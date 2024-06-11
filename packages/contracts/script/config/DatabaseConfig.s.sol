// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";

import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";
import {ReverseRegistrar} from
    "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import {NameWrapper} from "@ens-contracts/wrapper/NameWrapper.sol";
import {IBaseRegistrar} from "@ens-contracts/ethregistrar/IBaseRegistrar.sol";
import {IMetadataService} from "@ens-contracts/wrapper/IMetadataService.sol";
import {UniversalResolver} from "@ens-contracts/utils/UniversalResolver.sol";

import {ENSHelper} from "../Helper.sol";

contract DatabaseConfig is Script, ENSHelper {

    NetworkConfig private _activeNetworkConfig;

    struct NetworkConfig {
        string gatewayUrl;
        uint32 gatewayTimestamp;
        address[] signers;
        ENSRegistry registry;
    }

    constructor(uint256 chainId) {
        if (chainId == 11155111) _activeNetworkConfig = _getSepoliaConfig();
        else if (chainId == 1) _activeNetworkConfig = _getMainnetConfig();
        else _activeNetworkConfig = _getAnvilConfig();
    }

    function activeNetworkConfig()
        public
        view
        returns (
            string memory gatewayUrl,
            uint32 gatewayTimestamp,
            address[] memory signers,
            ENSRegistry registry
        )
    {
        return (
            _activeNetworkConfig.gatewayUrl,
            _activeNetworkConfig.gatewayTimestamp,
            _activeNetworkConfig.signers,
            _activeNetworkConfig.registry
        );
    }

    function _getMainnetConfig() private view returns (NetworkConfig memory) {
        address[] memory signers = new address[](0);
        return NetworkConfig({
            gatewayUrl: vm.envString("GATEWAY_URL"),
            gatewayTimestamp: 600,
            signers: signers,
            registry: ENSRegistry(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e)
        });
    }

    function _getSepoliaConfig() private view returns (NetworkConfig memory) {
        address[] memory signers = new address[](0);
        return NetworkConfig({
            gatewayUrl: vm.envString("GATEWAY_URL"),
            gatewayTimestamp: 600,
            signers: signers,
            registry: ENSRegistry(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e)
        });
    }

    function _getAnvilConfig() private returns (NetworkConfig memory) {
        if (address(_activeNetworkConfig.registry) != address(0)) {
            return _activeNetworkConfig;
        }

        address[] memory signers = new address[](1);
        signers[0] = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
        string[] memory urls = new string[](1);
        urls[0] = "http://127.0.0.1:3000/{sender}/{data}.json";

        vm.startBroadcast();
        ENSRegistry registry = new ENSRegistry();
        ReverseRegistrar registrar = new ReverseRegistrar(registry);

        new UniversalResolver(address(registry), urls);
        vm.stopBroadcast();

        // .reverse
        registry.setSubnodeOwner(
            rootNode, labelhash("reverse"), address(registrar)
        );
        // addr.reverse
        vm.prank(address(registrar));
        registry.setSubnodeOwner(
            namehash("reverse"), labelhash("addr"), address(registrar)
        );

        return NetworkConfig({
            gatewayUrl: urls[0],
            gatewayTimestamp: 600,
            signers: signers,
            registry: registry
        });
    }

}
