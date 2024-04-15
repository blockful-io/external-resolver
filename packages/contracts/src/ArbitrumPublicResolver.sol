//SPDX-License-Identifier: MIT
pragma solidity >=0.8.17 <0.9.0;

import "@ens-contracts/registry/ENS.sol";
import "@ens-contracts/resolvers/profiles/ABIResolver.sol";
import "@ens-contracts/resolvers/profiles/AddrResolver.sol";
import "@ens-contracts/resolvers/profiles/ContentHashResolver.sol";
import "@ens-contracts/resolvers/profiles/DNSResolver.sol";
import "@ens-contracts/resolvers/profiles/InterfaceResolver.sol";
import "@ens-contracts/resolvers/profiles/NameResolver.sol";
import "@ens-contracts/resolvers/profiles/PubkeyResolver.sol";
import "@ens-contracts/resolvers/profiles/TextResolver.sol";
import "@ens-contracts/resolvers/Multicallable.sol";
import {ReverseClaimer} from "@ens-contracts/reverseRegistrar/ReverseClaimer.sol";
import {INameWrapper} from "@ens-contracts/wrapper/INameWrapper.sol";

/**
 * A simple resolver anyone can use; only allows the owner of a node to set its
 * address.
 */
contract ArbitrumResolver is
    Multicallable,
    ABIResolver,
    AddrResolver,
    ContentHashResolver,
    DNSResolver,
    InterfaceResolver,
    NameResolver,
    PubkeyResolver,
    TextResolver,
    ReverseClaimer
{
    ENS immutable ens;
    // INameWrapper immutable nameWrapper;
    // address immutable trustedETHController;
    // address immutable trustedReverseRegistrar;

    /**
     * A mapping of operators. An address that is authorised for an address
     * may make any changes to the name that the owner could, but may not update
     * the set of authorisations.
     * (owner, operator) => approved
     */
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    /**
     * A mapping of delegates. A delegate that is authorised by an owner
     * for a name may make changes to the name's resolver, but may not update
     * the set of token approvals.
     * (owner, name, delegate) => approved
     */
    mapping(address => mapping(bytes32 => mapping(address => bool)))
        private _tokenApprovals;

    // Logged when an operator is added or removed.
    event ApprovalForAll(
        address indexed owner,
        address indexed operator,
        bool approved
    );

    // Logged when a delegate is approved or  an approval is revoked.
    event Approved(
        address owner,
        bytes32 indexed node,
        address indexed delegate,
        bool indexed approved
    );

    constructor(ENS _ens) ReverseClaimer(_ens, msg.sender) {
        ens = _ens;
        // nameWrapper = wrapperAddress;
        // trustedETHController = _trustedETHController;
        // trustedReverseRegistrar = _trustedReverseRegistrar;
    }

    /**
     * @dev See {IERC1155-setApprovalForAll}.
     */
    function setApprovalForAll(address operator, bool approved) external {
        require(
            msg.sender != operator,
            "ERC1155: setting approval status for self"
        );

        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    /**
     * @dev See {IERC1155-isApprovedForAll}.
     */
    function isApprovedForAll(
        address account,
        address operator
    ) public view returns (bool) {
        return _operatorApprovals[account][operator];
    }

    /**
     * @dev Approve a delegate to be able to updated records on a node.
     */
    function approve(bytes32 node, address delegate, bool approved) external {
        require(msg.sender != delegate, "Setting delegate status for self");

        _tokenApprovals[msg.sender][node][delegate] = approved;
        emit Approved(msg.sender, node, delegate, approved);
    }

    /**
     * @dev Check to see if the delegate has been approved by the owner for the node.
     */
    function isApprovedFor(
        address owner,
        bytes32 node,
        address delegate
    ) public view returns (bool) {
        return _tokenApprovals[owner][node][delegate];
    }

    function isAuthorised(bytes32 node) internal view override returns (bool) {
        // if (
        //     msg.sender == trustedETHController ||
        //     msg.sender == trustedReverseRegistrar
        // ) {
        //     return true;
        // }
        // address owner = ens.owner(node);
        // if (owner == address(nameWrapper)) {
        //     owner = nameWrapper.ownerOf(uint256(node));
        // }
        // return
        //     owner == msg.sender ||
        //     isApprovedForAll(owner, msg.sender) ||
        //     isApprovedFor(owner, node, msg.sender);
        return true;
    }

    function supportsInterface(
        bytes4 interfaceID
    )
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
