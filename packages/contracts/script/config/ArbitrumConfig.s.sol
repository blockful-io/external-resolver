// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";

import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";
import {IRollupCore} from "@nitro-contracts/src/rollup/IRollupCore.sol";
import {ReverseRegistrar} from
    "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import {NameWrapper} from "@ens-contracts/wrapper/NameWrapper.sol";
import {IBaseRegistrar} from "@ens-contracts/ethregistrar/IBaseRegistrar.sol";
import {IMetadataService} from "@ens-contracts/wrapper/IMetadataService.sol";
import {UniversalResolver} from "@ens-contracts/utils/UniversalResolver.sol";

import {ENSHelper} from "../Helper.sol";

contract ArbitrumConfig is Script, ENSHelper {

    NetworkConfig public activeNetworkConfig;

    struct NetworkConfig {
        ENSRegistry registry;
        ReverseRegistrar registrar;
        UniversalResolver universalResolver;
        IRollupCore rollup;
        NameWrapper nameWrapper;
        uint256 targetChainId;
    }

    constructor(uint256 chainId) {
        if (chainId == 11155111) activeNetworkConfig = _getSepoliaConfig();
        else if (chainId == 1) activeNetworkConfig = _getMainnetConfig();
        else activeNetworkConfig = _getAnvilConfig();
    }

    function _getMainnetConfig() private pure returns (NetworkConfig memory) {
        return NetworkConfig({
            registry: ENSRegistry(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e),
            registrar: ReverseRegistrar(0xa58E81fe9b61B5c3fE2AFD33CF304c454AbFc7Cb),
            universalResolver: UniversalResolver(
                0xce01f8eee7E479C928F8919abD53E553a36CeF67
            ),
            rollup: IRollupCore(0x5eF0D09d1E6204141B4d37530808eD19f60FBa35),
            nameWrapper: NameWrapper(0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401),
            targetChainId: 42161
        });
    }

    function _getSepoliaConfig() private pure returns (NetworkConfig memory) {
        return NetworkConfig({
            registry: ENSRegistry(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e),
            registrar: ReverseRegistrar(0xA0a1AbcDAe1a2a4A2EF8e9113Ff0e02DD81DC0C6),
            universalResolver: UniversalResolver(
                0xc8Af999e38273D658BE1b921b88A9Ddf005769cC
            ),
            rollup: IRollupCore(0xd80810638dbDF9081b72C1B33c65375e807281C8),
            nameWrapper: NameWrapper(0x0635513f179D50A207757E05759CbD106d7dFcE8),
            targetChainId: 421614
        });
    }

    function _getAnvilConfig() private returns (NetworkConfig memory) {
        if (address(activeNetworkConfig.registry) != address(0)) {
            return activeNetworkConfig;
        }

        string[] memory urls = new string[](1);
        urls[0] = "https://127.0.0.1:3000/{sender}/{data}.json";

        vm.startBroadcast();
        ENSRegistry registry = new ENSRegistry();
        UniversalResolver universalResolver =
            new UniversalResolver(address(registry), urls);

        ReverseRegistrar registrar = new ReverseRegistrar(registry);
        // .reverse
        registry.setSubnodeOwner(
            rootNode, labelhash("reverse"), address(registrar)
        );
        vm.stopBroadcast();

        vm.startPrank(address(registrar));
        // addr.reverse
        registry.setSubnodeOwner(
            namehash("reverse"), labelhash("addr"), address(registrar)
        );

        NameWrapper nameWrap = new NameWrapper(
            registry,
            IBaseRegistrar(address(registrar)),
            IMetadataService(msg.sender)
        );
        vm.stopPrank();

        return NetworkConfig({
            registry: registry,
            registrar: registrar,
            universalResolver: universalResolver,
            rollup: IRollupCore(0x3fC2B5464aD073036fEA6e396eC2Ac0406A3b058),
            nameWrapper: nameWrap,
            targetChainId: 31337
        });
    }

}
