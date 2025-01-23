// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface OperationRouter {

    /**
     * @dev Error to raise when an encoded function that is not supported
     * @dev is received on the getOperationHandler function
     */
    error FunctionNotSupported();

    /**
     * @dev Error to raise when mutations are being deferred onchain
     * that being the layer 1 or a layer 2
     * @param chainId Chain ID to perform the deferred mutation to.
     * @param contractAddress Contract Address at which the deferred mutation should transact with.
     */
    error OperationHandledOnchain(uint256 chainId, address contractAddress);

    /**
     * @notice Struct used to define the domain of the typed data signature, defined in EIP-712.
     * @param name The user friendly name of the contract that the signature corresponds to.
     * @param version The version of domain object being used.
     * @param chainId The ID of the chain that the signature corresponds to
     * @param verifyingContract The address of the contract that the signature pertains to.
     */
    struct DomainData {
        string name;
        string version;
        uint64 chainId;
        address verifyingContract;
    }

    /**
     * @notice Struct used to define the message context for off-chain storage authorization
     * @param data The original ABI encoded function call
     * @param sender The address of the user performing the mutation (msg.sender).
     * @param expirationTimestamp The timestamp at which the mutation will expire.
     */
    struct MessageData {
        bytes data;
        address sender;
        uint256 expirationTimestamp;
    }

    /**
     * @dev Error to raise when mutations are being deferred to an Offchain entity
     * @param sender the EIP-712 domain definition
     * @param url URL to request to perform the off-chain mutation
     * @param data The original ABI encoded function call along with authorization context
     */
    error OperationHandledOffchain(
        DomainData sender, string url, MessageData data
    );

    /**
     * @notice Determines the appropriate handler for an encoded function call
     * @param encodedFunction The ABI encoded function call
     */
    function getOperationHandler(bytes calldata encodedFunction)
        external
        view;

}
