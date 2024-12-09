// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IExtendedResolver} from
    "@ens-contracts/resolvers/profiles/IExtendedResolver.sol";
import {IAddrResolver} from
    "@ens-contracts/resolvers/profiles/IAddrResolver.sol";
import {IAddressResolver} from
    "@ens-contracts/resolvers/profiles/IAddressResolver.sol";
import {AddrResolver} from "@ens-contracts/resolvers/profiles/AddrResolver.sol";
import {TextResolver} from "@ens-contracts/resolvers/profiles/TextResolver.sol";
import {ContentHashResolver} from
    "@ens-contracts/resolvers/profiles/ContentHashResolver.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IMulticallable} from "@ens-contracts/resolvers/IMulticallable.sol";

import {ENSIP16} from "./ENSIP16.sol";
import {EVMFetcher} from "./evmgateway/EVMFetcher.sol";
import {IEVMVerifier} from "./evmgateway/IEVMVerifier.sol";
import {EVMFetchTarget} from "./evmgateway/EVMFetchTarget.sol";
import {IWriteDeferral} from "./interfaces/IWriteDeferral.sol";
import {OffchainRegister} from "./interfaces/WildcardWriting.sol";

contract L1Resolver is
    EVMFetchTarget,
    IExtendedResolver,
    IERC165,
    IWriteDeferral,
    IMulticallable,
    Ownable,
    ENSIP16
{

    using EVMFetcher for EVMFetcher.EVMFetchRequest;

    //////// ERRORS ////////

    /// @notice Error thrown when an unsupported function is called
    /// @dev Used to indicate when a function call is not implemented or allowed
    error FunctionNotSupported();

    //////// CONTRACT VARIABLE STATE ////////

    // address of each target contract
    mapping(bytes32 => address) public targets;

    //////// CONTRACT IMMUTABLE STATE ////////

    // id of chain that is storing the domains
    uint256 public immutable chainId;
    // EVM Verifier to handle data validation based on Merkle Proof
    IEVMVerifier immutable verifier;

    //////// CONSTANTS ////////

    /// Universal constant for the ETH coin type.
    uint256 constant COIN_TYPE_ETH = 60;
    uint256 constant RECORD_VERSIONS_SLOT = 0;
    uint256 constant VERSIONABLE_ADDRESSES_SLOT = 2;
    uint256 constant VERSIONABLE_HASHES_SLOT = 3;
    uint256 constant VERSIONABLE_TEXTS_SLOT = 10;
    uint256 constant PRICE_SLOT = 0;
    uint256 constant COMMIT_SLOT = 1;
    uint256 constant EXTRA_DATA_SLOT = 2;

    /// Contract targets
    bytes32 public constant TARGET_RESOLVER = keccak256("resolver");
    bytes32 public constant TARGET_REGISTRAR = keccak256("registrar");

    //////// INITIALIZER ////////

    /**
     * @notice Initializes the contract with the initial parameters
     * @param _verifier Gateway UR.
     */
    constructor(
        uint256 _chainId,
        address _target_resolver,
        address _target_registrar,
        IEVMVerifier _verifier,
        string memory _metadataUrl
    )
        ENSIP16(_metadataUrl)
    {
        require(
            address(_verifier) != address(0), "Verifier address must be set"
        );
        require(
            address(_target_registrar) != address(0),
            "Registry address must be set"
        );
        require(
            address(_target_resolver) != address(0),
            "Resolver address must be set"
        );
        verifier = _verifier;
        chainId = _chainId;
        setTarget(TARGET_RESOLVER, _target_resolver);
        setTarget(TARGET_REGISTRAR, _target_registrar);
    }

    //////// ENSIP Wildcard Writing ////////

    /**
     * @notice Validates and processes write parameters for deferred storage mutations
     * @param data The encoded data to be written
     * @dev This function reverts with StorageHandledByL2 error to indicate L2 deferral
     */
    function getDeferralHandler(bytes calldata data) public view override {
        bytes4 selector = bytes4(data);

        if (selector == OffchainRegister.register.selector) {
            _offChainStorage(targets[TARGET_REGISTRAR]);
        }

        if (
            selector == bytes4(keccak256("setAddr(bytes32,address)"))
                || selector == bytes4(keccak256("setAddr(bytes32,uint256,bytes)"))
                || selector == TextResolver.setText.selector
                || selector == ContentHashResolver.setContenthash.selector
        ) _offChainStorage(targets[TARGET_RESOLVER]);

        revert FunctionNotSupported();
    }

    //////// ENSIP 10 ////////

    /**
     * @dev Resolve and verify a record stored in l2 target address. It supports subdomain by fetching target recursively to the nearest parent.
     * @param -name DNS encoded ENS name to query
     * @param data The actual calldata
     * @return result result of the call
     */
    function resolve(
        bytes calldata, /* name */
        bytes calldata data
    )
        external
        view
        returns (bytes memory result)
    {
        bytes4 selector = bytes4(data);

        if (selector == IAddrResolver.addr.selector) {
            bytes32 node = abi.decode(data[4:], (bytes32));
            return _addr(node);
        }
        if (selector == IAddressResolver.addr.selector) {
            (bytes32 node, uint256 cointype) =
                abi.decode(data[4:], (bytes32, uint256));
            return _addr(node, cointype);
        }
        if (selector == TextResolver.text.selector) {
            (bytes32 node, string memory key) =
                abi.decode(data[4:], (bytes32, string));
            return bytes(_text(node, key));
        }
        if (selector == ContentHashResolver.contenthash.selector) {
            bytes32 node = abi.decode(data[4:], (bytes32));
            return _contenthash(node);
        }
        if (selector == this.getDeferralHandler.selector) {
            (bytes memory _data) = abi.decode(data[4:], (bytes));
            this.getDeferralHandler(_data);
        }
    }

    //////// ENS ERC-137 ////////

    /**
     * Sets the address associated with an ENS node.
     * May only be called by the owner of that node in the ENS registry.
     * @param -name The DNS encoded node to update.
     * @param -a The address to set.
     */
    function setAddr(bytes32, /* name */ address /* a */ ) external view {
        _offChainStorage(targets[TARGET_RESOLVER]);
    }

    function addr(bytes32 node) public view returns (address payable) {
        _addr(node);
    }

    function _addr(bytes32 node) private view returns (bytes memory) {
        EVMFetcher.newFetchRequest(verifier, targets[TARGET_RESOLVER]).getStatic(
            RECORD_VERSIONS_SLOT
        ).element(node).getDynamic(VERSIONABLE_ADDRESSES_SLOT).ref(0).element(
            node
        ).element(COIN_TYPE_ETH).fetch(this.addrCallback.selector, ""); // recordVersions
    }

    function addrCallback(
        bytes[] memory values,
        bytes memory
    )
        public
        pure
        returns (bytes memory)
    {
        return abi.encode(address(bytes20(values[1])));
    }

    //////// ENS ERC-2304 ////////

    /**
     * Sets the address associated with an ENS node.
     * May only be called by the owner of that node in the ENS registry.
     * @param -name The DNS encoded node to update.
     * @param -coinType The constant used to define the coin type of the corresponding address.
     * @param -a The address to set.
     */
    function setAddr(
        bytes32, /* name */
        uint256, /* coinType */
        bytes memory /* a */
    )
        public
        view
    {
        _offChainStorage(targets[TARGET_RESOLVER]);
    }

    function addr(
        bytes32 node,
        uint256 coinType
    )
        public
        view
        returns (bytes memory)
    {
        _addr(node, coinType);
    }

    function _addr(
        bytes32 node,
        uint256 coinType
    )
        private
        view
        returns (bytes memory)
    {
        EVMFetcher.newFetchRequest(verifier, targets[TARGET_RESOLVER]).getStatic(
            RECORD_VERSIONS_SLOT
        ).element(node).getDynamic(VERSIONABLE_ADDRESSES_SLOT).ref(0).element(
            node
        ).element(coinType).fetch(this.addrCoinTypeCallback.selector, "");
    }

    function addrCoinTypeCallback(
        bytes[] memory values,
        bytes memory
    )
        public
        pure
        returns (bytes memory)
    {
        return abi.encode(values[1]);
    }

    //////// ENS ERC-634 ////////

    /**
     * Sets the text data associated with an ENS node and key.
     * May only be called by the owner of that node in the ENS registry.
     * @param -name The DNS encoded node to update.
     * @param -key The key to set.
     * @param -value The text data value to set.
     */
    function setText(
        bytes32, /* name */
        string calldata, /* key */
        string calldata /* value */
    )
        external
        view
    {
        _offChainStorage(targets[TARGET_RESOLVER]);
    }

    function text(
        bytes32 node,
        string memory key
    )
        public
        view
        returns (string memory)
    {
        _text(node, key);
    }

    function _text(
        bytes32 node,
        string memory key
    )
        private
        view
        returns (bytes memory)
    {
        EVMFetcher.newFetchRequest(verifier, targets[TARGET_RESOLVER]).getStatic(
            RECORD_VERSIONS_SLOT
        ).element(node).getDynamic(VERSIONABLE_TEXTS_SLOT).ref(0).element(node)
            .element(key).fetch(this.textCallback.selector, "");
    }

    function textCallback(
        bytes[] memory values,
        bytes memory
    )
        public
        pure
        returns (bytes memory)
    {
        return abi.encode(string(values[1]));
    }

    //////// ENS ERC-1577 ////////

    /**
     * Sets the contenthash associated with an ENS node.
     * May only be called by the owner of that node in the ENS registry.
     * @param -name The DNS encoded node to update.
     * @param -hash The contenthash to set
     */
    function setContenthash(
        bytes32, /* name */
        bytes calldata /* hash */
    )
        external
        view
    {
        _offChainStorage(targets[TARGET_RESOLVER]);
    }

    function contenthash(bytes32 node) public view returns (bytes memory) {
        _contenthash(node);
    }

    function _contenthash(bytes32 node) private view returns (bytes memory) {
        EVMFetcher.newFetchRequest(verifier, targets[TARGET_RESOLVER]).getStatic(
            RECORD_VERSIONS_SLOT
        ).element(node).getDynamic(VERSIONABLE_HASHES_SLOT).ref(0).element(node)
            .fetch(this.contenthashCallback.selector, "");
    }

    function contenthashCallback(
        bytes[] memory values,
        bytes memory
    )
        public
        pure
        returns (bytes memory)
    {
        return values[1];
    }

    //////// ENS WRITE DEFERRAL RESOLVER (EIP-5559) ////////

    /**
     * @notice Builds an StorageHandledByL2 error.
     */
    function _offChainStorage(address target) internal view {
        revert StorageHandledByL2(chainId, target);
    }

    //////// ENS ERC-165 ////////

    function supportsInterface(bytes4 interfaceID)
        public
        view
        override(ENSIP16, IERC165)
        returns (bool)
    {
        return interfaceID == type(IExtendedResolver).interfaceId
            || interfaceID == type(IWriteDeferral).interfaceId
            || interfaceID == type(EVMFetchTarget).interfaceId
            || interfaceID == type(IERC165).interfaceId
            || interfaceID == type(ENSIP16).interfaceId
            || interfaceID == type(AddrResolver).interfaceId
            || interfaceID == type(TextResolver).interfaceId
            || interfaceID == type(ContentHashResolver).interfaceId
            || interfaceID == type(IMulticallable).interfaceId
            || super.supportsInterface(interfaceID);
    }

    //////// PUBLIC WRITE FUNCTIONS ////////

    /**
     * @notice Sets the new metadata URL and emits a MetadataUrlSet event.
     * @param newUrl New URL to be set.
     */
    function setMetadataUrl(string memory newUrl) external override onlyOwner {
        super._setMetadataUrl(newUrl);
    }

    /**
     * Set target address to redirect request to
     * @param target The L2 contract address
     */
    function setTarget(bytes32 key, address target) public onlyOwner {
        address prevAddr = targets[key];
        targets[key] = target;
        emit L2HandlerContractAddressChanged(chainId, prevAddr, target);
    }

    function multicall(bytes[] calldata /* data */ )
        external
        view
        override
        returns (bytes[] memory)
    {
        _offChainStorage(targets[TARGET_RESOLVER]);
    }

    function multicallWithNodeCheck(
        bytes32,
        bytes[] calldata /* data */
    )
        external
        view
        override
        returns (bytes[] memory)
    {
        _offChainStorage(targets[TARGET_RESOLVER]);
    }

}
