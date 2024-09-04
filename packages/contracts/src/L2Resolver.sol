//SPDX-License-Identifier: MIT
pragma solidity >=0.8.17 <0.9.0;

import {ENS} from "@ens-contracts/registry/ENS.sol";
import {INameWrapper} from "@ens-contracts/wrapper/INameWrapper.sol";
import {ABIResolver} from "@ens-contracts/resolvers/profiles/ABIResolver.sol";
import {AddrResolver} from "@ens-contracts/resolvers/profiles/AddrResolver.sol";
import {ContentHashResolver} from
    "@ens-contracts/resolvers/profiles/ContentHashResolver.sol";
import {DNSResolver} from "@ens-contracts/resolvers/profiles/DNSResolver.sol";
import {InterfaceResolver} from
    "@ens-contracts/resolvers/profiles/InterfaceResolver.sol";
import {NameResolver} from "@ens-contracts/resolvers/profiles/NameResolver.sol";
import {PubkeyResolver} from
    "@ens-contracts/resolvers/profiles/PubkeyResolver.sol";
import {TextResolver} from "@ens-contracts/resolvers/profiles/TextResolver.sol";
import {Multicallable} from "@ens-contracts/resolvers/Multicallable.sol";

import {EIP1155} from "./EIP1155.sol";

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
    TextResolver,
    EIP1155
{

    ENS immutable ens;
    INameWrapper immutable nameWrapper;
    address immutable trustedETHController;

    constructor(
        ENS _ens,
        address _trustedETHController,
        INameWrapper _nameWrapper
    ) {
        ens = _ens;
        nameWrapper = _nameWrapper;
        trustedETHController = _trustedETHController;
    }

    function isAuthorised(bytes32 node) internal view override returns (bool) {
        if (msg.sender == trustedETHController) return true;
        address owner = ens.owner(node);
        if (owner == address(nameWrapper)) {
            owner = nameWrapper.ownerOf(uint256(node));
        }
        return owner == msg.sender || isApprovedForAll(owner, msg.sender)
            || isApprovedFor(owner, node, msg.sender);
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
        return super.supportsInterface(interfaceID);
    }

}
