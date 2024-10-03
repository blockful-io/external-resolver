//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";

contract DeployHelper is Script {

    error InvalidChain();
    error InvalidContractName(uint256 chainId, string name);

    struct Transaction {
        string transactionType;
        string contractName;
        address contractAddress;
    }

    string root;
    string broadcastPath;

    constructor() {
        root = vm.projectRoot();
        broadcastPath = string.concat(root, "/broadcast");
    }

    function _getLatestBroadcastFile(
        uint256 chainId,
        string memory contractName
    )
        private
        view
        returns (string memory)
    {
        return string.concat(
            broadcastPath,
            "/",
            contractName,
            ".sol",
            "/",
            vm.toString(chainId),
            "/run-latest.json"
        );
    }

    function getContractAddress(string memory contractName)
        public
        view
        returns (address)
    {
        return getContractAddress(contractName, contractName, block.chainid);
    }

    function getContractAddress(
        string memory contractName,
        uint256 chainId
    )
        public
        view
        returns (address)
    {
        return getContractAddress(contractName, contractName, chainId);
    }

    function getContractAddress(
        string memory fileName,
        string memory contractName,
        uint256 chainId
    )
        public
        view
        returns (address)
    {
        string memory latestBroadcastFile =
            _getLatestBroadcastFile(chainId, fileName);
        string memory jsonContent = vm.readFile(latestBroadcastFile);

        bytes memory transactionsData =
            vm.parseJson(jsonContent, ".transactions");
        uint256 transactionsLength = abi.decode(transactionsData, (uint256));

        for (uint256 i = 0; i < transactionsLength; i++) {
            string memory transactionType = abi.decode(
                vm.parseJson(
                    jsonContent,
                    string.concat(
                        ".transactions[", vm.toString(i), "].transactionType"
                    )
                ),
                (string)
            );

            if (keccak256(bytes(transactionType)) == keccak256(bytes("CREATE")))
            {
                string memory currentContractName = abi.decode(
                    vm.parseJson(
                        jsonContent,
                        string.concat(
                            ".transactions[", vm.toString(i), "].contractName"
                        )
                    ),
                    (string)
                );

                if (
                    keccak256(bytes(currentContractName))
                        == keccak256(bytes(contractName))
                ) {
                    address contractAddress = abi.decode(
                        vm.parseJson(
                            jsonContent,
                            string.concat(
                                ".transactions[",
                                vm.toString(i),
                                "].contractAddress"
                            )
                        ),
                        (address)
                    );
                    return contractAddress;
                }
            }
        }
        revert InvalidContractName(chainId, contractName);
    }

}
