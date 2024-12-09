// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/// @notice The details of a registration request.
/// @param name The DNS-encoded name being registered (e.g. "alice.eth", "alice.bob.eth")
/// @param owner The address that will own the registered name
/// @param duration The length of time in seconds to register the name for
/// @param secret The secret to be used for the registration based on commit/reveal
/// @param resolver The address of the resolver contract that will store the name's records
/// @param data Array of encoded function calls to set records in the resolver after registration
/// @param reverseRecord Whether to set this name as the primary name for the owner address
/// @param fuses Permissions to set on the name that control how it can be managed
/// @param extraData Additional registration data encoded as bytes
struct RegisterRequest {
    bytes name;
    address owner;
    uint256 duration;
    bytes32 secret;
    address resolver;
    bytes[] data;
    bool reverseRecord;
    uint16 fuses;
    bytes extraData;
}

interface OffchainRegister {

    /// @notice Registers a domain name
    /// @param request The registration request details
    /// @dev Forwards the registration request to the L2 contracts for processing
    function register(RegisterRequest calldata request) external payable;

}

interface OffchainRegisterParams {

    /// @notice Struct containing registration parameters for a name
    /// @param price The total price in wei required to register the name
    /// @param available Whether the name is available for registration
    /// @param token Token address (ERC-7528 ether address or ERC-20 contract)
    /// @param commitTime The commit duration in seconds
    /// @param extraData Additional registration data encoded as bytes
    struct RegisterParams {
        uint256 price;
        bool available;
        address token;
        uint256 commitTime;
        bytes extraData;
    }

    /// @notice Returns the registration parameters for a given name and duration
    /// @dev This function calculates and returns the registration parameters needed to register a name
    /// @param name The DNS-encoded name to query for registration parameters (e.g. "alice.eth", "alice.bob.eth")
    /// @param duration The duration in seconds for which the name should be registered
    /// @return A struct containing the registration parameters
    function registerParams(
        bytes calldata name,
        uint256 duration
    )
        external
        view
        returns (RegisterParams memory);

}

interface OffchainCommitable {

    /// @notice Produces the commit hash from the register request
    /// @param request The registration request details
    /// @return commitHash The hash that should be committed before registration
    function makeCommitment(RegisterRequest calldata request)
        external
        pure
        returns (bytes32 commitHash);

    /// @notice Commits a hash of registration data to prevent frontrunning
    /// @param commitment The hash of the registration request data that will be used in a future register call
    /// @dev The commitment must be revealed after the minimum commit age and before the maximum commit age
    function commit(bytes32 commitment) external;

}

interface OffchainTransferrable {

    /// @notice Transfers ownership of a name to a new address
    /// @param name The DNS-encoded name to transfer (e.g. "alice.eth", "alice.bob.eth")
    /// @param owner The current owner of the name
    /// @param newOwner The address to transfer ownership to
    function transferFrom(
        bytes calldata name,
        address owner,
        address newOwner
    )
        external;

}
