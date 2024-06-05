// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";

contract Config is Script {
    NetworkConfig private _activeNetworkConfig;

    struct NetworkConfig {
        string gatewayUrl;
        uint32 gatewayTimestamp;
        address[] signers;
    }

    constructor(uint256 chainId) {
        if (chainId == 11155111) {
            _activeNetworkConfig = _getSepoliaConfig();
        } else if (chainId == 1) {
            _activeNetworkConfig = _getMainnetConfig();
        } else {
            _activeNetworkConfig = _getAnvilConfig();
        }
    }

    function activeNetworkConfig()
        public
        view
        returns (string memory gatewayUrl, uint32 gatewayTimestamp, address[] memory signers)
    {
        return (_activeNetworkConfig.gatewayUrl, _activeNetworkConfig.gatewayTimestamp, _activeNetworkConfig.signers);
    }

    function _getMainnetConfig() private view returns (NetworkConfig memory) {
        address[] memory signers = new address[](0);
        return NetworkConfig({gatewayUrl: vm.envString("GATEWAY_URL"), gatewayTimestamp: 600, signers: signers});
    }

    function _getSepoliaConfig() private view returns (NetworkConfig memory) {
        address[] memory signers = new address[](0);
        return NetworkConfig({gatewayUrl: vm.envString("GATEWAY_URL"), gatewayTimestamp: 600, signers: signers});
    }

    function _getAnvilConfig() private pure returns (NetworkConfig memory) {
        address[] memory signers = new address[](1);
        signers[0] = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
        return NetworkConfig({
            gatewayUrl: "http://127.0.0.1:3000/{sender}/{data}.json",
            gatewayTimestamp: 600,
            signers: signers
        });
    }
}
