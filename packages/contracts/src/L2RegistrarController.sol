//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import {BaseRegistrarImplementation} from
    "@ens-contracts/ethregistrar/BaseRegistrarImplementation.sol";
import {StringUtils} from "@ens-contracts/ethregistrar/StringUtils.sol";
import {Resolver} from "@ens-contracts/resolvers/Resolver.sol";
import {ENS} from "@ens-contracts/registry/ENS.sol";
import {ReverseRegistrar} from
    "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import {ReverseClaimer} from
    "@ens-contracts/reverseRegistrar/ReverseClaimer.sol";
import {
    IETHRegistrarController,
    IPriceOracle
} from "@ens-contracts/ethregistrar/IETHRegistrarController.sol";
import {INameWrapper} from "@ens-contracts/wrapper/INameWrapper.sol";
import {ERC20Recoverable} from "@ens-contracts/utils/ERC20Recoverable.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

error NameNotAvailable(string name);
error InsufficientValue();
error Unauthorised(bytes32 node);

/**
 * @dev A registrar controller for registering and renewing names at fixed cost.
 */
contract L2RegistrarController is
    Ownable,
    IETHRegistrarController,
    IERC165,
    ERC20Recoverable,
    ReverseClaimer
{

    using StringUtils for *;
    using Address for address;

    bytes32 private constant ETH_NODE =
        0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae;
    BaseRegistrarImplementation immutable base;
    IPriceOracle public immutable prices;
    ReverseRegistrar public immutable reverseRegistrar;
    INameWrapper public immutable nameWrapper;

    event NameRegistered(
        string name,
        bytes32 indexed label,
        address indexed owner,
        uint256 baseCost,
        uint256 premium,
        uint256 expires
    );
    event NameRenewed(
        string name, bytes32 indexed label, uint256 cost, uint256 expires
    );

    constructor(
        BaseRegistrarImplementation _base,
        IPriceOracle _prices,
        ReverseRegistrar _reverseRegistrar,
        INameWrapper _nameWrapper,
        ENS _ens
    )
        ReverseClaimer(_ens, msg.sender)
    {
        base = _base;
        prices = _prices;
        reverseRegistrar = _reverseRegistrar;
        nameWrapper = _nameWrapper;
    }

    function makeCommitment(
        string memory,
        address,
        uint256,
        bytes32,
        address,
        bytes[] calldata,
        bool,
        uint16
    )
        external
        pure
        returns (bytes32)
    {
        return keccak256("0");
    }

    function commit(bytes32) external {}

    function rentPrice(
        string memory name,
        uint256 duration
    )
        public
        view
        override
        returns (IPriceOracle.Price memory price)
    {
        bytes32 label = keccak256(bytes(name));
        price = prices.price(name, base.nameExpires(uint256(label)), duration);
    }

    function valid(string memory name) public pure returns (bool) {
        return name.strlen() >= 3;
    }

    function available(string memory name)
        public
        view
        override
        returns (bool)
    {
        bytes32 label = keccak256(bytes(name));
        return valid(name) && base.available(uint256(label));
    }

    function register(
        string calldata name,
        address owner,
        uint256 duration,
        bytes32, /* secret */
        address resolver,
        bytes[] calldata data,
        bool reverseRecord,
        uint16 ownerControlledFuses
    )
        public
        payable
        override(IETHRegistrarController)
    {
        IPriceOracle.Price memory price = rentPrice(name, duration);
        if (msg.value < price.base + price.premium) revert InsufficientValue();

        uint256 expires = nameWrapper.registerAndWrapETH2LD(
            name, owner, duration, resolver, ownerControlledFuses
        );

        if (data.length > 0) {
            _setRecords(resolver, keccak256(bytes(name)), data);
        }

        if (reverseRecord) _setReverseRecord(name, resolver, msg.sender);

        emit NameRegistered(
            name,
            keccak256(bytes(name)),
            owner,
            price.base,
            price.premium,
            expires
        );

        if (msg.value > (price.base + price.premium)) {
            payable(msg.sender).transfer(
                msg.value - (price.base + price.premium)
            );
        }
    }

    function renew(
        string calldata name,
        uint256 duration
    )
        external
        payable
        override
    {
        bytes32 labelhash = keccak256(bytes(name));
        uint256 tokenId = uint256(labelhash);
        IPriceOracle.Price memory price = rentPrice(name, duration);
        if (msg.value < price.base) revert InsufficientValue();
        uint256 expires = nameWrapper.renew(tokenId, duration);

        if (msg.value > price.base) {
            payable(msg.sender).transfer(msg.value - price.base);
        }

        emit NameRenewed(name, labelhash, msg.value, expires);
    }

    function withdraw() public {
        payable(owner()).transfer(address(this).balance);
    }

    function supportsInterface(bytes4 interfaceID)
        external
        pure
        returns (bool)
    {
        return interfaceID == type(IERC165).interfaceId
            || interfaceID == type(IETHRegistrarController).interfaceId;
    }

    /* Internal functions */

    function _setRecords(
        address resolverAddress,
        bytes32 label,
        bytes[] calldata data
    )
        internal
    {
        // use hardcoded .eth namehash
        bytes32 nodehash = keccak256(abi.encodePacked(ETH_NODE, label));
        Resolver resolver = Resolver(resolverAddress);
        resolver.multicallWithNodeCheck(nodehash, data);
    }

    function _setReverseRecord(
        string memory name,
        address resolver,
        address owner
    )
        internal
    {
        reverseRegistrar.setNameForAddr(
            msg.sender, owner, resolver, string.concat(name, ".eth")
        );
    }

}
