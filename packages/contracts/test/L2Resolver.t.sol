// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "forge-std/Test.sol";

import "@ens-contracts/resolvers/profiles/ABIResolver.sol";
import "@ens-contracts/resolvers/profiles/AddrResolver.sol";
import "@ens-contracts/resolvers/profiles/ContentHashResolver.sol";
import "@ens-contracts/resolvers/profiles/DNSResolver.sol";
import "@ens-contracts/resolvers/profiles/InterfaceResolver.sol";
import "@ens-contracts/resolvers/profiles/NameResolver.sol";
import "@ens-contracts/resolvers/profiles/PubkeyResolver.sol";
import "@ens-contracts/resolvers/profiles/TextResolver.sol";
import "@ens-contracts/resolvers/Multicallable.sol";

import {L2Resolver} from "../src/L2Resolver.sol";
import {ENSHelper} from "../script/Helper.sol";

contract L2ResolverTest is Test, ENSHelper {

    L2Resolver resolver;
    bytes32 testNode;
    address owner = address(0x123);
    address nonOwner = address(0x456);

    function setUp() public {
        resolver = new L2Resolver();
        testNode = namehash("test.eth");
        resolver.setOwner(testNode, owner);
    }

    function test_OwnerCanSetOwner() public {
        vm.prank(owner);
        resolver.setOwner(testNode, address(this));
        assertEq(resolver.owner(testNode), address(this));
    }

    function test_NonOwnerCannotSetOwner() public {
        vm.prank(nonOwner);
        vm.expectRevert(
            abi.encodeWithSelector(
                L2Resolver.L2Resolver__ForbiddenAction.selector, testNode
            )
        );
        resolver.setOwner(testNode, nonOwner);
    }

    function test_DefaultOwnerIsZero() public {
        bytes32 newTestNode = keccak256(abi.encodePacked("newtestnode"));
        assertEq(resolver.owner(newTestNode), address(0));
    }

    function test_AuthorisedCanSetAddr() public {
        vm.prank(owner);
        resolver.setAddr(testNode, 60, abi.encodePacked(address(0x1234)));
        assertEq(resolver.addr(testNode), address(0x1234));
    }

    function test_UnauthorisedCannotSetAddr() public {
        vm.prank(nonOwner);
        vm.expectRevert(); //abi.encodeWithSelector(L2Resolver.L2Resolver__ForbiddenAction.selector, testNode);
        resolver.setAddr(testNode, 60, abi.encodePacked(address(0x1234)));
    }

    function test_OwnerCanSetText() public {
        vm.prank(owner);
        resolver.setText(testNode, "com.twitter", "@example");
        assertEq(resolver.text(testNode, "com.twitter"), "@example");
    }

    function test_NonOwnerCannotSetText() public {
        vm.prank(nonOwner);
        vm.expectRevert(); //abi.encodeWithSelector(L2Resolver.L2Resolver__ForbiddenAction.selector, testNode);
        resolver.setText(testNode, "com.twitter", "@example");
    }

    function test_SupportsInterface() public {
        assertTrue(resolver.supportsInterface(type(ABIResolver).interfaceId));
        assertTrue(resolver.supportsInterface(type(AddrResolver).interfaceId));
        assertTrue(
            resolver.supportsInterface(type(ContentHashResolver).interfaceId)
        );
        assertTrue(resolver.supportsInterface(type(DNSResolver).interfaceId));
        assertTrue(
            resolver.supportsInterface(type(InterfaceResolver).interfaceId)
        );
        assertTrue(resolver.supportsInterface(type(NameResolver).interfaceId));
        assertTrue(resolver.supportsInterface(type(PubkeyResolver).interfaceId));
        assertTrue(resolver.supportsInterface(type(TextResolver).interfaceId));
        assertTrue(resolver.supportsInterface(type(Multicallable).interfaceId));
    }

    function test_SetAddrAndGetAddr() public {
        vm.prank(owner);
        resolver.setAddr(testNode, 60, abi.encodePacked(address(0x1234)));
        address actual = address(uint160(bytes20(resolver.addr(testNode, 60))));
        assertEq(actual, address(0x1234));
    }

    function test_SetContentHashAndGetContentHash() public {
        bytes memory contentHash = hex"1234";
        vm.prank(owner);
        resolver.setContenthash(testNode, contentHash);
        assertEq(resolver.contenthash(testNode), contentHash);
    }

    function test_SetABIAndGetABI() public {
        uint256 contentType = 1;
        bytes memory data = hex"1234";
        vm.prank(owner);
        resolver.setABI(testNode, contentType, data);
        (uint256 retrievedContentType, bytes memory retrievedData) =
            resolver.ABI(testNode, contentType);
        assertEq(retrievedContentType, contentType);
        assertEq(retrievedData, data);
    }

    function test_SetPubkeyAndGetPubkey() public {
        bytes32 x = bytes32(uint256(0x1234));
        bytes32 y = bytes32(uint256(0x5678));
        vm.prank(owner);
        resolver.setPubkey(testNode, x, y);
        (bytes32 retrievedX, bytes32 retrievedY) = resolver.pubkey(testNode);
        assertEq(retrievedX, x);
        assertEq(retrievedY, y);
    }

    function test_SetNameAndGetName() public {
        string memory name = "example.eth";
        vm.prank(owner);
        resolver.setName(testNode, name);
        assertEq(resolver.name(testNode), name);
    }

}
