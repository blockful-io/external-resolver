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
    mapping(bytes32 => address) private _owners;

    function isAuthorised(bytes32 node) internal view override returns (bool) {
        return _owners[node] == msg.sender || _owners[node] == address(0);
    }

    function setOwner(bytes32 node, address _owner) public authorised(node) {
        _owners[node] = _owner;
    }

    function owner(bytes32 node) public view returns (address) {
        return _owners[node];
    }

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
        return super.supportsInterface(interfaceID);
    }
}
