// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IExtendedDBWriteResolver {
    error StorageHandledByOffChainDatabase(address sender, string url, bytes data);

    function write(bytes memory data) external view returns (bytes memory);
}
