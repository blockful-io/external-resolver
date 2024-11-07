// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Test, console} from "forge-std/Test.sol";

import {DummyOffchainResolver} from
    "@ens-contracts/test/mocks/DummyOffchainResolver.sol";
import {NameEncoder} from "@ens-contracts/utils/NameEncoder.sol";
import {Multicallable} from "@ens-contracts/resolvers/Multicallable.sol";

import "../src/SubdomainController.sol";
import {ENSHelper} from "../script/ENSHelper.sol";

contract DummyNameWrapper {

    mapping(bytes32 => address) public owners;

    function ownerOf(uint256 id) public view returns (address) {
        return owners[bytes32(id)];
    }

    function setSubnodeRecord(
        bytes32 parentNode,
        string memory label,
        address owner,
        address, /* resolver */
        uint64, /* ttl */
        uint32, /* fuses */
        uint64 /* expiry */
    )
        public
        returns (bytes32 node)
    {
        node = keccak256(abi.encodePacked(parentNode, keccak256(bytes(label))));
        owners[node] = owner;
        return node;
    }

}

contract DummyResolver is DummyOffchainResolver, Multicallable {

    mapping(bytes32 => mapping(string => string)) private records;

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(DummyOffchainResolver, Multicallable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function setText(
        bytes32 node,
        string calldata key,
        string calldata value
    )
        external
    {
        records[node][key] = value;
    }

    function text(
        bytes32 node,
        string calldata key
    )
        external
        view
        returns (string memory)
    {
        return records[node][key];
    }

}

contract SubdomainControllerTest is Test, ENSHelper {

    SubdomainController public controller;
    DummyNameWrapper public nameWrapper;
    DummyResolver public resolver;

    uint256 constant PRICE = 0.1 ether;

    function setUp() public {
        nameWrapper = new DummyNameWrapper();
        resolver = new DummyResolver();
        controller = new SubdomainController(address(nameWrapper), PRICE);
    }

    function testRegister() public {
        (bytes memory name, bytes32 node) =
            NameEncoder.dnsEncodeName("newdomain.blockful.eth");
        address owner = address(0x123);
        uint256 duration = 365 days;
        bytes32 secret = bytes32(0);
        bytes[] memory data = new bytes[](0);

        vm.expectCall(
            address(nameWrapper),
            abi.encodeWithSelector(
                DummyNameWrapper.setSubnodeRecord.selector,
                namehash("blockful.eth"),
                "newdomain",
                owner,
                address(resolver),
                0,
                0,
                duration
            )
        );

        vm.deal(address(this), PRICE);
        controller.register{value: PRICE}(
            RegisterRequest(
                name,
                owner,
                duration,
                secret,
                address(resolver),
                data,
                false,
                0,
                bytes("")
            )
        );

        assertEq(
            nameWrapper.ownerOf(uint256(node)),
            owner,
            "Owner should be set correctly"
        );
    }

    function testRegisterInsufficientFunds() public {
        (bytes memory name,) =
            NameEncoder.dnsEncodeName("newdomain.blockful.eth");
        address owner = address(0x123);
        uint256 duration = 365 days;
        bytes32 secret = bytes32(0);
        bytes[] memory data = new bytes[](0);

        vm.expectRevert("insufficient funds");

        controller.register{value: PRICE - 1}(
            RegisterRequest(
                name,
                owner,
                duration,
                secret,
                address(resolver),
                data,
                false,
                0,
                bytes("")
            )
        );
    }

    function testRegisterAlreadyRegistered() public {
        (bytes memory name,) =
            NameEncoder.dnsEncodeName("existingdomain.blockful.eth");
        address owner = address(0x123);
        uint256 duration = 365 days;
        bytes32 secret = bytes32(0);
        bytes[] memory data = new bytes[](0);

        // Simulate that the domain is already registered
        nameWrapper.setSubnodeRecord(
            namehash("blockful.eth"),
            "existingdomain",
            owner,
            address(0),
            0,
            0,
            0
        );

        vm.expectRevert("domain already registered");

        vm.deal(address(this), PRICE);
        controller.register{value: PRICE}(
            RegisterRequest(
                name,
                owner,
                duration,
                secret,
                address(resolver),
                data,
                false,
                0,
                bytes("")
            )
        );
    }

    function testRegisterWithResolverData() public {
        (bytes memory name, bytes32 node) =
            NameEncoder.dnsEncodeName("newdomain.blockful.eth");
        address owner = address(0x123);
        uint256 duration = 365 days;
        bytes32 secret = bytes32(0);

        bytes[] memory data = new bytes[](1);
        data[0] = abi.encodeWithSelector(
            DummyResolver.setText.selector, node, "key", "value"
        );

        vm.expectCall(
            address(nameWrapper),
            abi.encodeWithSelector(
                DummyNameWrapper.setSubnodeRecord.selector,
                namehash("blockful.eth"),
                "newdomain",
                owner,
                address(resolver),
                0,
                0,
                duration
            )
        );

        vm.expectCall(
            address(resolver),
            abi.encodeWithSelector(
                Multicallable.multicallWithNodeCheck.selector, node, data
            )
        );

        vm.deal(address(this), PRICE);
        controller.register{value: PRICE}(
            RegisterRequest(
                name,
                owner,
                duration,
                secret,
                address(resolver),
                data,
                false,
                0,
                bytes("")
            )
        );

        assertEq(
            nameWrapper.ownerOf(uint256(node)),
            owner,
            "Owner should be set correctly"
        );

        // Verify that the text record was saved correctly
        assertEq(
            resolver.text(node, "key"),
            "value",
            "Text record should be set correctly"
        );
    }

}
