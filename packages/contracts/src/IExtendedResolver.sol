// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IExtendedResolver {
    error OffchainLookup(address sender, string[] urls, bytes callData, bytes4 callbackFunction, bytes extraData);

    function resolve(bytes memory name, bytes memory data) external view returns (bytes memory);
}
