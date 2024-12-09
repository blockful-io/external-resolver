// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface OffchainRegister {

    /**
     * Forwards the registering of a domain to the L2 contracts
     * @param name DNS-encoded name to be registered.
     * @param owner Owner of the domain
     * @param duration duration The duration in seconds of the registration.
     * @param secret The secret to be used for the registration based on commit/reveal
     * @param resolver The address of the resolver to set for this name.
     * @param data Multicallable data bytes for setting records in the associated resolver upon reigstration.
     * @param reverseRecord Whether this name is the primary name
     * @param fuses The fuses to set for this name.
     * @param extraData any encoded additional data
     */
    function register(
        bytes calldata name,
        address owner,
        uint256 duration,
        bytes32 secret,
        address resolver,
        bytes[] calldata data,
        bool reverseRecord,
        uint16 fuses,
        bytes memory extraData
    )
        external
        payable;

}

interface OffchainRegisterParams {

    /**
     * @notice Returns the registration parameters for a given name and duration
     * @param name The DNS-encoded name to query
     * @param duration The duration in seconds for the registration
     * @return price The price of the registration in wei per second
     * @return commitTime the amount of time the commit should wait before being revealed
     * @return extraData any given structure in an ABI encoded format
     */
    function registerParams(
        bytes calldata name,
        uint256 duration
    )
        external
        view
        returns (uint256 price, uint256 commitTime, bytes memory extraData);

}

interface OffchainCommitable {

    /**
     * @notice produces the commit hash from the register calldata
     * @return commitHash the hash of the commit to be used
     */
    function makeCommitment(
        string calldata name,
        address owner,
        uint256 duration,
        bytes32 secret,
        address resolver,
        bytes[] calldata data,
        bool reverseRecord,
        uint16 fuses,
        bytes memory extraData
    )
        external
        pure
        returns (bytes32 commitHash);

    /**
     * @notice Commits the register callData to prevent frontrunning.
     * @param commitment hash of the register callData
     */
    function commit(bytes32 commitment) external;

}
