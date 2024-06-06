// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@ens-contracts/registry/ENS.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {INameWrapper} from "@ens-contracts/wrapper/INameWrapper.sol";
import {BytesUtils} from "@ens-contracts/dnssec-oracle/BytesUtils.sol";
import {HexUtils} from "@ens-contracts/utils/HexUtils.sol";
import {IExtendedResolver} from "@ens-contracts/resolvers/profiles/IExtendedResolver.sol";
import {IAddrResolver} from "@ens-contracts/resolvers/profiles/IAddrResolver.sol";
import {IAddressResolver} from "@ens-contracts/resolvers/profiles/IAddressResolver.sol";
import {ITextResolver} from "@ens-contracts/resolvers/profiles/ITextResolver.sol";
import {IContentHashResolver} from "@ens-contracts/resolvers/profiles/IContentHashResolver.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {EnumerableSetUpgradeable} from "./utils/EnumerableSetUpgradeable.sol";

import "./IWriteDeferral.sol";
import {EVMFetcher} from "./evmgateway/EVMFetcher.sol";
import {IEVMVerifier} from "./evmgateway/IEVMVerifier.sol";
import {EVMFetchTarget} from "./evmgateway/EVMFetchTarget.sol";

contract L1Resolver is EVMFetchTarget, IExtendedResolver, IERC165, IWriteDeferral, Ownable {
    using EVMFetcher for EVMFetcher.EVMFetchRequest;
    using BytesUtils for bytes;
    using HexUtils for bytes;

    //////// ERRORS ////////

    error L1Resolver__ForbiddenAction(bytes32 node);

    //////// CONTRACT VARIABLE STATE ////////

    // id of chain that is storing the domains
    uint32 public chainId;
    // Mapping domain -> offchain contract address
    mapping(bytes32 => address) private _targets;

    //////// CONTRACT IMMUTABLE STATE ////////

    ENS immutable ens;
    INameWrapper immutable nameWrapper;
    // EVM Verifier to handle data validation based on Merkle Proof
    IEVMVerifier immutable verifier;

    //////// CONSTANTS ////////

    /// Universal constant for the ETH coin type.
    uint256 constant COIN_TYPE_ETH = 60;
    uint256 constant RECORD_VERSIONS_SLOT = 0;
    uint256 constant VERSIONABLE_ADDRESSES_SLOT = 2;
    uint256 constant VERSIONABLE_HASHES_SLOT = 3;
    uint256 constant VERSIONABLE_TEXTS_SLOT = 10;

    //////// INITIALIZER ////////

    /**
     * @notice Initializes the contract with the initial parameters
     * @param _verifier Gateway UR.
     * @param _ens Signer addresses
     * @param _nameWrapper ENS' NameWrapper
     */
    constructor(uint32 _chainId, IEVMVerifier _verifier, ENS _ens, INameWrapper _nameWrapper) {
        require(address(_nameWrapper) != address(0), "Name Wrapper address must be set");
        require(address(_verifier) != address(0), "Verifier address must be set");
        require(address(_ens) != address(0), "Registry address must be set");
        ens = _ens;
        verifier = _verifier;
        nameWrapper = _nameWrapper;

        setChainId(_chainId);
    }

    //////// ENSIP 10 ////////

    /**
     * @dev Resolve and verify a record stored in l2 target address. It supports subname by fetching target recursively to the nearlest parent.
     * @param name DNS encoded ENS name to query
     * @param data The actual calldata
     * @return result result of the call
     */
    function resolve(bytes calldata name, bytes calldata data) external view returns (bytes memory result) {
        (, address target) = getTarget(name);
        bytes4 selector = bytes4(data);

        if (selector == IAddrResolver.addr.selector) {
            (bytes32 node) = abi.decode(data[4:], (bytes32));
            return _addr(node, target);
        }
        if (selector == IAddressResolver.addr.selector) {
            (bytes32 node, uint256 cointype) = abi.decode(data[4:], (bytes32, uint256));
            return _addr(node, cointype, target);
        }
        if (selector == ITextResolver.text.selector) {
            (bytes32 node, string memory key) = abi.decode(data[4:], (bytes32, string));
            return bytes(_text(node, key, target));
        }
        if (selector == IContentHashResolver.contenthash.selector) {
            (bytes32 node) = abi.decode(data[4:], (bytes32));
            return _contenthash(node, target);
        }
    }

    //////// ENS ERC-137 ////////

    /**
     * Sets the address associated with an ENS node.
     * May only be called by the owner of that node in the ENS registry.
     * @param name The DNS encoded node to update.
     * @param a The address to set.
     */
    function setAddr(bytes calldata name, address a) external {
        _offChainStorage(name);
    }

    function _addr(bytes32 node, address target) private view returns (bytes memory) {
        EVMFetcher.newFetchRequest(verifier, target).getStatic(RECORD_VERSIONS_SLOT).element(node).getDynamic(
            VERSIONABLE_ADDRESSES_SLOT
        ).ref(0).element(node).element(COIN_TYPE_ETH).fetch(this.addrCallback.selector, ""); // recordVersions
    }

    function addrCallback(bytes[] memory values, bytes memory) public pure returns (bytes memory) {
        return abi.encode(address(bytes20(values[1])));
    }

    //////// ENS ERC-2304 ////////

    /**
     * Sets the address associated with an ENS node.
     * May only be called by the owner of that node in the ENS registry.
     * @param name The DNS encoded node to update.
     * @param coinType The constant used to define the coin type of the corresponding address.
     * @param a The address to set.
     */
    function setAddr(bytes calldata name, uint256 coinType, bytes memory a) public {
        _offChainStorage(name);
    }

    function _addr(bytes32 node, uint256 coinType, address target) private view returns (bytes memory) {
        EVMFetcher.newFetchRequest(verifier, target).getStatic(RECORD_VERSIONS_SLOT).element(node).getDynamic(
            VERSIONABLE_ADDRESSES_SLOT
        ).ref(0).element(node).element(coinType).fetch(this.addrCoinTypeCallback.selector, "");
    }

    function addrCoinTypeCallback(bytes[] memory values, bytes memory) public pure returns (bytes memory) {
        return abi.encode(values[1]);
    }

    //////// ENS ERC-634 ////////

    /**
     * Sets the text data associated with an ENS node and key.
     * May only be called by the owner of that node in the ENS registry.
     * @param name The DNS encoded node to update.
     * @param key The key to set.
     * @param value The text data value to set.
     */
    function setText(bytes calldata name, string calldata key, string calldata value) external {
        _offChainStorage(name);
    }

    function _text(bytes32 node, string memory key, address target) private view returns (bytes memory) {
        EVMFetcher.newFetchRequest(verifier, target).getStatic(RECORD_VERSIONS_SLOT).element(node).getDynamic(
            VERSIONABLE_TEXTS_SLOT
        ).ref(0).element(node).element(key).fetch(this.textCallback.selector, "");
    }

    function textCallback(bytes[] memory values, bytes memory) public pure returns (bytes memory) {
        return abi.encode(string(values[1]));
    }

    //////// ENS ERC-1577 ////////

    /**
     * Sets the contenthash associated with an ENS node.
     * May only be called by the owner of that node in the ENS registry.
     * @param name The DNS encoded node to update.
     * @param hash The contenthash to set
     */
    function setContenthash(bytes calldata name, bytes calldata hash) external {
        _offChainStorage(name);
    }

    function _contenthash(bytes32 node, address target) private view returns (bytes memory) {
        EVMFetcher.newFetchRequest(verifier, target).getStatic(RECORD_VERSIONS_SLOT).element(node).getDynamic(
            VERSIONABLE_HASHES_SLOT
        ).ref(0).element(node).fetch(this.contenthashCallback.selector, "");
    }

    function contenthashCallback(bytes[] memory values, bytes memory) public pure returns (bytes memory) {
        return abi.encode(values[1]);
    }

    //////// ENS WRITE DEFERRAL RESOLVER (EIP-5559) ////////

    /**
     * @notice Builds an StorageHandledByL2 error.
     *
     * @param name The DNS encoded node to update.
     */
    function _offChainStorage(bytes calldata name) internal view {
        (, address target) = this.getTarget(name);
        revert StorageHandledByL2(chainId, target);
    }

    //////// ENS ERC-165 ////////

    function supportsInterface(bytes4 interfaceID) public pure returns (bool) {
        return interfaceID == type(IExtendedResolver).interfaceId || interfaceID == type(IERC165).interfaceId
            || interfaceID == type(EVMFetchTarget).interfaceId;
    }

    //////// PUBLIC VIEW FUNCTIONS ////////

    function getTarget(bytes calldata name) public view returns (bytes32, address) {
        return getTarget(name, 0);
    }

    /**
     * @dev Returns the L2 target address that can answer queries for `name`.
     * @param name DNS encoded ENS name to query
     * @param offset for recursive resolution
     * @return node namehash of resolved domain
     * @return target The L2 resolver address to verify against.
     */
    function getTarget(bytes calldata name, uint256 offset) public view returns (bytes32 node, address target) {
        uint256 len = name.readUint8(offset);
        node = bytes32(0);
        if (len > 0) {
            bytes32 label = name.keccak(offset + 1, len);
            (node, target) = getTarget(name, offset + len + 1);
            node = keccak256(abi.encodePacked(node, label));
            if (_targets[node] != address(0)) {
                return (node, _targets[node]);
            }
        } else {
            return (bytes32(0), address(0));
        }
        return (node, target);
    }

    //////// PUBLIC WRITE FUNCTIONS ////////

    /**
     * Set target address to verify against
     * @param name The ENS node to query.
     * @param target The L2 resolver address to verify against.
     */
    function setTarget(bytes calldata name, address target) public {
        (bytes32 node, address prevAddr) = getTarget(name);
        if (!isAuthorised(node)) {
            revert L1Resolver__ForbiddenAction(node);
        }
        _targets[node] = target;
        emit L2HandlerContractAddressChanged(chainId, prevAddr, target);
    }

    /**
     * Set chainId for offchain storage
     * @param _chainId id of the given chain
     */
    function setChainId(uint32 _chainId) public onlyOwner {
        uint32 prevChainId = chainId;
        chainId = _chainId;
        emit L2HandlerDefaultChainIdChanged(prevChainId, chainId);
    }

    //////// PRIVATE FUNCTIONS ////////

    function isAuthorised(bytes32 node) internal view returns (bool) {
        // TODO: Add support for
        // trustedETHController
        // trustedReverseRegistrar
        // isApprovedForAll
        // isApprovedFor
        address owner = ens.owner(node);

        // TODO fix local namewrapper deployment
        // if (owner == address(nameWrapper)) {
        //     owner = nameWrapper.ownerOf(uint256(node));
        // }

        return owner == msg.sender || owner == address(0);
    }
}
