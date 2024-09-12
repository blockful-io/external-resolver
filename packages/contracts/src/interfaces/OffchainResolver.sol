// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface OffchainResolver {

    /**
     * Forwards the registering of a domain to the L2 contracts
     * @param -name The DNS-encoded name to resolve.
     * @param -owner Owner of the domain
     * @param -duration duration The duration in seconds of the registration.
     * @param -resolver The address of the resolver to set for this name.
     * @param -data Multicallable data bytes for setting records in the associated resolver upon reigstration.
     * @param -fuses The fuses to set for this name.
     */
    function register(
        string calldata, /* name */
        address, /* owner */
        uint256, /* duration */
        bytes32, /* secret */
        address, /* resolver */
        bytes[] calldata, /* data */
        bool, /* reverseRecord */
        uint16 /* fuses */
    )
        external
        payable;

}
