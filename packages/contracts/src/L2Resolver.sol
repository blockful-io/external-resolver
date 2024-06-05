//SPDX-License-Identifier: MIT
pragma solidity >=0.8.17 <0.9.0;

import "@ens-contracts/resolvers/profiles/ABIResolver.sol";
import "@ens-contracts/resolvers/profiles/AddrResolver.sol";
import "@ens-contracts/resolvers/profiles/ContentHashResolver.sol";
import "@ens-contracts/resolvers/profiles/DNSResolver.sol";
import "@ens-contracts/resolvers/profiles/InterfaceResolver.sol";
import "@ens-contracts/resolvers/profiles/NameResolver.sol";
import "@ens-contracts/resolvers/profiles/PubkeyResolver.sol";
import "@ens-contracts/resolvers/profiles/TextResolver.sol";
import "@ens-contracts/resolvers/Multicallable.sol";

/**
 * A simple resolver anyone can use; only allows the owner of a node to set its
 * address.
 */
contract L2Resolver is
    Multicallable,
    ABIResolver,
    AddrResolver,
    ContentHashResolver,
    DNSResolver,
    InterfaceResolver,
    NameResolver,
    PubkeyResolver,
    TextResolver
{
    //////// ERRORS ////////

    error L2Resolver__UnavailableDomain(bytes32 node);
    error L2Resolver__ForbiddenAction(bytes32 node);

    //////// STATE VARIABLES ////////

    mapping(bytes32 => address) private _owners;

    //////// PUBLIC READ METHODS ////////

    function owner(bytes32 node) public view returns (address) {
        return _owners[node];
    }

    //////// PUBLIC WRITE METHODS ////////

    function setOwner(bytes32 node, address _owner) public {
        if (!isAuthorised(node)) {
            revert L2Resolver__ForbiddenAction(node);
        }

        _owners[node] = _owner;
    }

    //////// INTERNAL READ METHODS ////////

    function isAuthorised(bytes32 node) internal view override returns (bool) {
        return _owners[node] == msg.sender || _owners[node] == address(0);
    }

    //////// ERC-165 ////////

    function supportsInterface(bytes4 interfaceID)
        public
        view
        override(
            Multicallable,
            ABIResolver,
            AddrResolver,
            ContentHashResolver,
            DNSResolver,
            InterfaceResolver,
            NameResolver,
            PubkeyResolver,
            TextResolver
        )
        returns (bool)
    {
        return interfaceID == type(Multicallable).interfaceId || interfaceID == type(ABIResolver).interfaceId
            || interfaceID == type(AddrResolver).interfaceId || interfaceID == type(ContentHashResolver).interfaceId
            || interfaceID == type(DNSResolver).interfaceId || interfaceID == type(InterfaceResolver).interfaceId
            || interfaceID == type(NameResolver).interfaceId || interfaceID == type(PubkeyResolver).interfaceId
            || interfaceID == type(TextResolver).interfaceId;
    }
}
