// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";

contract Config is Script {
    NetworkConfig public activeNetworkConfig;

    struct NetworkConfig {
        string gatewayUrl;
        uint32 gatewayTimestamp;
    }

    constructor(uint256 chainId) {
        if (chainId == 11155111) {
            activeNetworkConfig = _getSepoliaConfig();
        } else if (chainId == 1) {
            activeNetworkConfig = _getMemoliaConfig();
        } else {
            activeNetworkConfig = _getAnvilConfig();
        }
    }

    function _getMemoliaConfig() private view returns (NetworkConfig memory) {
        NetworkConfig({gatewayUrl: vm.envString("GATEWAY_URL"), gatewayTimestamp: 600});
    }

    function _getSepoliaConfig() private view returns (NetworkConfig memory) {
        NetworkConfig({gatewayUrl: vm.envString("GATEWAY_URL"), gatewayTimestamp: 600});
    }

    function _getAnvilConfig() private pure returns (NetworkConfig memory) {
        return NetworkConfig({gatewayUrl: "http://127.0.0.1:3000/{sender}/{data}.json", gatewayTimestamp: 600});
    }
}
