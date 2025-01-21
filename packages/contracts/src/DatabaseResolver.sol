// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {OffchainLookup} from
    "@ens-contracts/dnsregistrar/OffchainDNSResolver.sol";
import {IExtendedResolver} from
    "@ens-contracts/resolvers/profiles/IExtendedResolver.sol";
import {AddrResolver} from "@ens-contracts/resolvers/profiles/AddrResolver.sol";
import {NameResolver} from "@ens-contracts/resolvers/profiles/NameResolver.sol";
import {ABIResolver} from "@ens-contracts/resolvers/profiles/ABIResolver.sol";
import {IMulticallable} from "@ens-contracts/resolvers/IMulticallable.sol";
import {PubkeyResolver} from
    "@ens-contracts/resolvers/profiles/PubkeyResolver.sol";
import {TextResolver} from "@ens-contracts/resolvers/profiles/TextResolver.sol";
import {ContentHashResolver} from
    "@ens-contracts/resolvers/profiles/ContentHashResolver.sol";
import {IMulticallable} from "@ens-contracts/resolvers/IMulticallable.sol";

import {ENSIP16} from "./ENSIP16.sol";
import {SignatureVerifier} from "./SignatureVerifier.sol";
import {IWriteDeferral} from "./interfaces/IWriteDeferral.sol";
import {EnumerableSetUpgradeable} from "./utils/EnumerableSetUpgradeable.sol";

/**
 * Implements an ENS resolver that directs all queries to a CCIP read gateway.
 * Callers must implement EIP 3668 and ENSIP 10.
 */
contract DatabaseResolver is
    ERC165,
    ENSIP16,
    IExtendedResolver,
    IWriteDeferral,
    AddrResolver,
    ABIResolver,
    PubkeyResolver,
    TextResolver,
    ContentHashResolver,
    NameResolver,
    IMulticallable,
    Ownable
{

    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    //////// CONTRACT STATE ////////

    string public gatewayUrl;
    // Expiration timestamp for an offchain signature
    uint256 public gatewayDatabaseTimeoutDuration;
    EnumerableSetUpgradeable.AddressSet private _signers;

    /// The chainId that this contract lives on
    uint64 private immutable _CHAIN_ID;

    //////// EVENTS ////////

    event SignerAdded(address indexed addedSigner);
    event SignerRemoved(address indexed removedSigner);
    event GatewayUrlSet(string indexed previousUrl, string indexed newUrl);
    event OffChainDatabaseTimeoutDurationSet(
        uint256 previousDuration, uint256 newDuration
    );

    //////// CONSTANTS ////////

    /// Universal constant for the ETH coin type.
    uint256 private constant _COIN_TYPE_ETH = 60;
    /// Constant for name used in the domain definition of the off-chain write deferral reversion.
    string private constant _WRITE_DEFERRAL_DOMAIN_NAME = "DatabaseResolver";
    /// Constant specifing the version of the domain definition.
    string private constant _WRITE_DEFERRAL_DOMAIN_VERSION = "1";

    //////// INITIALIZER ////////

    /**
     * @notice Initializes the contract with the initial parameters.
     * @param newGatewayUrl Gateway URL
     * @param newGraphqlUrl GraphQL URL
     * @param newOffChainDatabaseTimeoutDuration how long an offchain signature will last
     * @param newSigners Signer addresses
     */
    constructor(
        string memory newGatewayUrl,
        string memory newGraphqlUrl,
        uint256 newOffChainDatabaseTimeoutDuration,
        address[] memory newSigners
    )
        ENSIP16(newGraphqlUrl)
    {
        _CHAIN_ID = uint64(block.chainid);

        _addSigners(newSigners);
        _setGatewayUrl(newGatewayUrl);
        _setOffChainDatabaseTimeoutDuration(newOffChainDatabaseTimeoutDuration);
    }

    /* Dummy implementation of the isAuthorised to implement inherited virtual functions */
    function isAuthorised(bytes32 /*node*/ )
        internal
        pure
        override
        returns (bool)
    {
        return true;
    }

    //////// ENSIP Wildcard Writing ////////

    /**
     * @notice Read call for fetching the required parameters for the offchain call
     * @notice avoiding multiple transactions
     * @param data The encoded data to be written
     * @dev This function reverts with StorageHandledByL2 error to indicate L2 deferral
     */
    function getDeferralHandler(bytes calldata data) public view override {
        _offChainStorage(data);
    }

    //////// ENSIP 10 ////////

    /**
     * Resolves a name, as specified by ENSIP 10 (wildcard).
     * @param - name The DNS-encoded name to resolve.
     * @param data The ABI encoded data for the underlying resolution function
     * (Eg, addr(bytes32), text(bytes32,string), etc).
     * @return The return data, ABI encoded identically to the underlying function.
     */
    function resolve(
        bytes calldata, /* name */
        bytes calldata data
    )
        external
        view
        override
        returns (bytes memory)
    {
        // EIP-181 `name(bytes32)` should be handled on-chain because the ENS
        // contracts call it during
        if (bytes4(data[:4]) == NameResolver.name.selector) {
            (bytes32 node) = abi.decode(data[4:], (bytes32));
            return bytes(this.name(node));
        }

        if (bytes4(data[:4]) == this.getDeferralHandler.selector) {
            (bytes memory _data) = abi.decode(data[4:], (bytes));
            this.getDeferralHandler(_data);
        }

        _offChainLookup(data);
    }

    //////// ENS ERC-137 ////////

    /**
     * Sets the address associated with an ENS node.
     * @param -node The node to update.
     * @param -a The address to set.
     */
    function setAddr(
        bytes32, /* node */
        address /* a */
    )
        external
        view
        override
    {
        _offChainStorage(msg.data);
    }

    /**
     * Returns the address associated with an ENS node.
     * @param node The ENS node to query.
     * @return Always reverts with an OffchainLookup error.
     */
    function addr(bytes32 node)
        public
        view
        virtual
        override
        returns (address payable)
    {
        addr(node, _COIN_TYPE_ETH);
    }

    //////// ENS ERC-2304 LOGIC ////////

    /**
     * Sets the address associated with an ENS node.
     * @param -node The node to update.
     * @param -coinType The constant used to define the coin type of the corresponding address.
     * @param -a The address to set.
     */
    function setAddr(
        bytes32, /* node */
        uint256, /* coinType */
        bytes memory /* a */
    )
        public
        view
        override
    {
        _offChainStorage(msg.data);
    }

    /**
     * Returns the address associated with an ENS node for the corresponding coinType.
     * @param - node The ENS node to query.
     * @param - coinType The coin type of the corresponding address.
     * @return Always reverts with an OffchainLookup error.
     */
    function addr(
        bytes32, /* node */
        uint256 /* coinType */
    )
        public
        view
        override
        returns (bytes memory)
    {
        _offChainLookup(msg.data);
    }

    //////// ENS ERC-634 LOGIC ////////

    /**
     * Sets the text data associated with an ENS node and key.
     * @param -node The node to update.
     * @param -key The key to set.
     * @param -value The text data value to set.
     */
    function setText(
        bytes32, /* node */
        string calldata, /* key */
        string calldata /* value */
    )
        external
        view
        override
    {
        _offChainStorage(msg.data);
    }

    /**
     * Returns the text data associated with an ENS node and key.
     * @param = node The ENS node to query.
     * @param = key The text data key to query.
     * @return Always reverts with an OffchainLookup error.
     */
    function text(
        bytes32, /* node */
        string calldata /* key */
    )
        external
        view
        override
        returns (string memory)
    {
        _offChainLookup(msg.data);
    }

    //////// ENS ERC-1577 LOGIC ////////

    /**
     * Sets the contenthash associated with an ENS node.
     * @param -node The node to update.
     * @param -hash The contenthash to set
     */
    function setContenthash(
        bytes32, /* node */
        bytes calldata /* hash */
    )
        external
        view
        override
    {
        _offChainStorage(msg.data);
    }

    /**
     * Returns the contenthash associated with an ENS node.
     * @param - node The ENS node to query.
     * @return Always reverts with an OffchainLookup error.
     */
    function contenthash(bytes32 /* node */ )
        external
        view
        override
        returns (bytes memory)
    {
        _offChainLookup(msg.data);
    }

    //////// ENS ERC-205 LOGIC ////////

    /**
     * Returns the contenthash associated with an ENS node.
     * @param - node The ENS node to query.
     * @param - contentType encoding of the returned ABI
     * @return Always reverts with an OffchainLookup error.
     */
    function ABI(
        bytes32, /* node */
        uint256 /* contentTypes */
    )
        external
        view
        override
        returns (uint256, bytes memory)
    {
        _offChainLookup(msg.data);
    }

    function setABI(
        bytes32, /* node */
        uint256, /* contentType */
        bytes calldata /* data */
    )
        external
        view
        override
    {
        _offChainStorage(msg.data);
    }

    //////// ENS ERC-619 LOGIC ////////

    function pubkey(bytes32 /* node */ )
        external
        view
        override
        returns (bytes32, /* x */ bytes32 /* y */ )
    {
        _offChainLookup(msg.data);
    }

    function setPubkey(
        bytes32, /* node */
        bytes32, /* x */
        bytes32 /* y */
    )
        external
        view
        override
    {
        _offChainStorage(msg.data);
    }

    //////// CCIP READ (EIP-3668) ////////

    /**
     * @notice Builds an OffchainLookup error.
     * @param callData The calldata for the corresponding lookup.
     * @return Always reverts with an OffchainLookup error.
     */
    function _offChainLookup(bytes calldata callData)
        private
        view
        returns (bytes memory)
    {
        string[] memory urls = new string[](1);
        urls[0] = gatewayUrl;

        revert OffchainLookup(
            address(this),
            urls,
            callData,
            this.resolveWithProof.selector,
            abi.encode(callData, address(this))
        );
    }

    /**
     * Callback used by CCIP read compatible clients to verify and parse the response.
     */
    function resolveWithProof(
        bytes calldata response,
        bytes calldata extraData
    )
        external
        view
        returns (bytes memory)
    {
        (address signer, bytes memory result) =
            SignatureVerifier.verify(extraData, response);
        if (!this.isSigner(signer)) {
            revert SignatureVerifier.SignatureVerifier__InvalidSignature(
                "invalid signer"
            );
        }
        return result;
    }

    //////// MULTICALL ////////

    function multicall(bytes[] calldata /* data */ )
        external
        view
        override
        returns (bytes[] memory)
    {
        _offChainStorage(msg.data);
    }

    function multicallWithNodeCheck(
        bytes32, /* node */
        bytes[] calldata /* data */
    )
        external
        view
        override
        returns (bytes[] memory)
    {
        _offChainStorage(msg.data);
    }

    //////// ENS WRITE DEFERRAL RESOLVER (EIP-5559) ////////

    /**
     * @notice Builds an StorageHandledByOffChainDatabase error.
     */
    function _offChainStorage(bytes calldata callData) private view {
        revert StorageHandledByOffChainDatabase(
            IWriteDeferral.domainData({
                name: _WRITE_DEFERRAL_DOMAIN_NAME,
                version: _WRITE_DEFERRAL_DOMAIN_VERSION,
                chainId: _CHAIN_ID,
                verifyingContract: address(this)
            }),
            gatewayUrl,
            IWriteDeferral.messageData({
                data: callData,
                sender: msg.sender,
                expirationTimestamp: block.timestamp
                    + gatewayDatabaseTimeoutDuration
            })
        );
    }

    //////// PUBLIC VIEW FUNCTIONS ////////

    /**
     * @notice Returns a list of signers.
     * @return List of signers.
     */
    function signers() external view returns (address[] memory) {
        return _signers.values();
    }

    /**
     * @notice Returns whether a given account is a signer.
     * @return True if a given account is a signer.
     */
    function isSigner(address account) external view returns (bool) {
        return _signers.contains(account);
    }

    //////// PUBLIC WRITE FUNCTIONS ////////

    /**
     * @notice Sets the new metadata URL and emits a MetadataUrlSet event.
     * @param newUrl New URL to be set.
     */
    function setMetadataUrl(string memory newUrl) external override onlyOwner {
        _setMetadataUrl(newUrl);
    }

    /**
     * @notice Set the gateway URL.
     * @dev Can only be called by the gateway manager.
     * @param newUrl New gateway URL.
     */
    function setGatewayUrl(string calldata newUrl) external onlyOwner {
        _setGatewayUrl(newUrl);
    }

    /**
     * @notice Set the offChainDatabase Timeout Duration.
     * @dev Can only be called by the gateway manager.
     * @param newDuration New offChainDatabase timout duration.
     */
    function setOffChainDatabaseTimoutDuration(uint256 newDuration)
        external
        onlyOwner
    {
        _setOffChainDatabaseTimeoutDuration(newDuration);
    }

    /**
     * @notice Add a set of new signers.
     * @dev Can only be called by the signer manager.
     * @param signersToAdd Signer addresses.
     */
    function addSigners(address[] calldata signersToAdd) external onlyOwner {
        _addSigners(signersToAdd);
    }

    /**
     * @notice Remove a set of existing signers.
     * @dev Can only be called by the signer manager.
     * @param signersToRemove Signer addresses.
     */
    function removeSigners(address[] calldata signersToRemove)
        external
        onlyOwner
    {
        uint256 length = signersToRemove.length;
        for (uint256 i = 0; i < length; i++) {
            address signer = signersToRemove[i];
            if (_signers.remove(signer)) emit SignerRemoved(signer);
        }
    }

    //////// PRIVATE FUNCTIONS ////////

    /**
     * @notice Sets the new gateway URL and emits a GatewayUrlSet event.
     * @param newUrl New URL to be set.
     */
    function _setGatewayUrl(string memory newUrl) private {
        string memory previousUrl = gatewayUrl;
        gatewayUrl = newUrl;

        emit GatewayUrlSet(previousUrl, newUrl);
    }

    /**
     * @notice Sets the new off-chain database timout duration and emits an OffChainDatabaseTimeoutDurationSet event.
     * @param newDuration New timout duration to be set.
     */
    function _setOffChainDatabaseTimeoutDuration(uint256 newDuration) private {
        uint256 previousDuration = gatewayDatabaseTimeoutDuration;
        gatewayDatabaseTimeoutDuration = newDuration;

        emit OffChainDatabaseTimeoutDurationSet(previousDuration, newDuration);
    }

    /**
     * @notice Adds new signers and emits a SignersAdded event.
     * @param signersToAdd List of addresses to add as signers.
     */
    function _addSigners(address[] memory signersToAdd) private {
        uint256 length = signersToAdd.length;
        for (uint256 i = 0; i < length; i++) {
            address signer = signersToAdd[i];
            if (_signers.add(signer)) emit SignerAdded(signer);
        }
    }

    /**
     * @notice Support ERC-165 introspection.
     * @param interfaceID Interface ID.
     * @return True if a given interface ID is supported.
     */
    function supportsInterface(bytes4 interfaceID)
        public
        view
        override(
            ENSIP16,
            ERC165,
            ABIResolver,
            AddrResolver,
            NameResolver,
            TextResolver,
            PubkeyResolver,
            ContentHashResolver
        )
        returns (bool)
    {
        return interfaceID == type(IWriteDeferral).interfaceId
            || interfaceID == type(IExtendedResolver).interfaceId
            || interfaceID == type(IMulticallable).interfaceId
            || super.supportsInterface(interfaceID);
    }

}
