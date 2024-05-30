// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@ens-contracts/registry/ENS.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {INameWrapper} from "@ens-contracts/wrapper/INameWrapper.sol";
import {BytesUtils} from "@ens-contracts/wrapper/BytesUtils.sol";
import {HexUtils} from "@ens-contracts/utils/HexUtils.sol";
import {IExtendedResolver} from "@ens-contracts/resolvers/profiles/IExtendedResolver.sol";
import {IAddrResolver} from "@ens-contracts/resolvers/profiles/IAddrResolver.sol";
import {IAddressResolver} from "@ens-contracts/resolvers/profiles/IAddressResolver.sol";
import {ITextResolver} from "@ens-contracts/resolvers/profiles/ITextResolver.sol";
import {IContentHashResolver} from "@ens-contracts/resolvers/profiles/IContentHashResolver.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {EnumerableSetUpgradeable} from "./utils/EnumerableSetUpgradeable.sol";

import "./IExtendedResolver.sol";
import "./IWriteDeferral.sol";
import {EVMFetcher} from "./evmgateway/EVMFetcher.sol";
import {IEVMVerifier} from "./evmgateway/IEVMVerifier.sol";
import {EVMFetchTarget} from "./evmgateway/EVMFetchTarget.sol";

contract L1Resolver is
    EVMFetchTarget,
    IExtendedResolver,
    IERC165,
    IAddrResolver,
    IAddressResolver,
    ITextResolver,
    IContentHashResolver,
    IWriteDeferral,
    Ownable
{
    using EVMFetcher for EVMFetcher.EVMFetchRequest;
    using BytesUtils for bytes;
    using HexUtils for bytes;

    //////// CONTRACT STATE ////////

    uint32 public chainId;
    mapping(bytes32 => address) private _targets;

    // ENS Registry
    ENS immutable ens;
    // EVM Verifier to handle data validation based on Merkle Proof
    IEVMVerifier immutable verifier;
    // TODO what does it do?
    INameWrapper immutable nameWrapper;

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
     * @param _nameWrapper TODO
     */
    constructor(uint32 _chainId, IEVMVerifier _verifier, ENS _ens, INameWrapper _nameWrapper) Ownable() {
        require(address(_nameWrapper) != address(0), "Name Wrapper address must be set");
        require(address(_verifier) != address(0), "Verifier address must be set");
        require(address(_ens) != address(0), "Registry address must be set");
        verifier = _verifier;
        ens = _ens;
        nameWrapper = _nameWrapper;

        setChainId(_chainId);
    }

    //////// MODIFIERS ////////

    modifier authorised(bytes32 node) {
        require(isAuthorised(node));
        _;
    }

    //////// ENSIP 10 ////////

    /**
     * @dev Resolve and verify a record stored in l2 target address. It supports subname by fetching target recursively to the nearlest parent.
     * @param name DNS encoded ENS name to query
     * @param data The actual calldata
     * @return result result of the call
     */
    function resolve(bytes calldata name, bytes calldata data) external view returns (bytes memory result) {
        (, address target) = getTarget(name, 0);
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
     * @param node The node to update.
     * @param a The address to set.
     */
    function setAddr(bytes32 node, address a) external {
        _offChainStorage(node);
    }

    function addr(bytes32 node) external view override returns (address payable) {
        this.resolve(abi.encodePacked(node), msg.data);
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
     * @param node The node to update.
     * @param coinType The constant used to define the coin type of the corresponding address.
     * @param a The address to set.
     */
    function setAddr(bytes32 node, uint256 coinType, bytes memory a) public {
        _offChainStorage(node);
    }

    function addr(bytes32 node, uint256 coinType) external view override returns (bytes memory) {
        this.resolve(abi.encodePacked(node), msg.data);
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
     * @param node The node to update.
     * @param key The key to set.
     * @param value The text data value to set.
     */
    function setText(bytes32 node, string calldata key, string calldata value) external {
        _offChainStorage(node);
    }

    function text(bytes32 node, string memory key) external view override returns (string memory) {
        this.resolve(abi.encodePacked(node), msg.data);
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
     * @param node The node to update.
     * @param hash The contenthash to set
     */
    function setContenthash(bytes32 node, bytes calldata hash) external {
        _offChainStorage(node);
    }

    function contenthash(bytes32 node) external view override returns (bytes memory) {
        this.resolve(abi.encodePacked(node), msg.data);
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
     */
    function _offChainStorage(bytes32 node) internal view {
        address target = _targets[node];
        revert StorageHandledByL2(chainId, target);
    }

    //////// ENS ERC-165 ////////

    function supportsInterface(bytes4 interfaceID) public pure returns (bool) {
        return interfaceID == type(IExtendedResolver).interfaceId || interfaceID == type(IERC165).interfaceId
            || interfaceID == type(EVMFetchTarget).interfaceId;
    }

    //////// PUBLIC VIEW FUNCTIONS ////////

    function getTarget(bytes calldata name) public view returns (bytes32 node, address target) {
        return getTarget(name, 0);
    }

    /**
     * @dev Returns the L2 target address that can answer queries for `name`.
     * @param name DNS encoded ENS name to query
     * @param offset The offset of the label to query recursively.
     * @return node The node of the name
     * @return target The L2 resolver address to verify against.
     */
    function getTarget(bytes calldata name, uint256 offset) public view returns (bytes32, address) {
        uint256 labelLength = uint256(uint8(name[offset]));
        if (labelLength == 0) {
            return (bytes32(0), address(0));
        }
        uint256 nextLabel = offset + labelLength + 1;
        bytes32 labelHash;
        if (
            labelLength == 66
            // 0x5b == '['
            && name[offset + 1] == 0x5b
            // 0x5d == ']'
            && name[nextLabel - 1] == 0x5d
        ) {
            // Encrypted label
            (labelHash,) = bytes(name[offset + 2:nextLabel - 1]).hexStringToBytes32(0, 64);
        } else {
            labelHash = keccak256(name[offset + 1:nextLabel]);
        }
        (bytes32 parentnode, address parentresolver) = getTarget(name, nextLabel);
        bytes32 node = keccak256(abi.encodePacked(parentnode, labelHash));
        address resolver = _targets[node];
        if (resolver != address(0)) {
            return (node, resolver);
        }
        return (node, parentresolver);
    }

    //////// PUBLIC WRITE FUNCTIONS ////////

    /**
     * Set target address to verify against
     * @param node The ENS node to query.
     * @param target The L2 resolver address to verify against.
     */
    function setTarget(bytes32 node, address target) public authorised(node) {
        address prevAddr = _targets[node];
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

        // TODO fix this assertion
        // if (owner == address(nameWrapper)) {
        //     owner = nameWrapper.ownerOf(uint256(node));
        // }

        return owner == msg.sender;
    }
}
