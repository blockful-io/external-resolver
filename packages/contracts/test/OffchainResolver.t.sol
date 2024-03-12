// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import "../src/Helper.sol";
import "@ens-contracts/registry/ENSRegistry.sol";
import {PublicResolver, INameWrapper} from "@ens-contracts/resolvers/PublicResolver.sol";
import "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import "@ens-contracts/utils/UniversalResolver.sol";
import {OffchainResolver} from "../src/OffchainResolver.sol";

// OffchainResolverTest is a test contract for OffchainResolver
contract OffchainResolverTest is Test, ENSHelper {
    OffchainResolver public resolver;
    ENSRegistry public registry;
    address constant owner = address(0x1337);

    // Initial setup before each test
    function setUp() public {
        vm.startPrank(owner);
        registry = new ENSRegistry();
        string[] memory urls = new string[](1);
        urls[0] = "localhost:8080";
        new UniversalResolver(address(registry), urls);
        ReverseRegistrar registrar = new ReverseRegistrar(registry);

        // .reverse
        registry.setSubnodeOwner(rootNode, labelhash("reverse"), owner);
        // addr.reverse
        registry.setSubnodeOwner(
            namehash("reverse"),
            labelhash("addr"),
            address(registrar)
        );

        // OffchainResolver contract setup
        address[] memory signers = new address[](1);
        signers[0] = address(0x1337);
        string memory url = "https://gateway.com";
        resolver = new OffchainResolver(url, signers);
        registrar.setDefaultResolver(address(resolver));

        vm.stopPrank();
    }

    // Test the setSubnodeRecord function for the first level
    function test_SetSubnodeRecord1stLevel() external {
        vm.prank(owner);
        registry.setSubnodeRecord(
            rootNode,
            labelhash("eth"),
            owner,
            address(resolver),
            10000000
        );

        assertEq(registry.owner(namehash("eth")), owner);
        assertEq(registry.resolver(namehash("eth")), address(resolver));
    }

    // Test the setSubnodeRecord function for the second level
    function test_SetSubnodeRecord2nLevel() external {
        vm.prank(owner);
        registry.setSubnodeRecord(
            rootNode,
            labelhash("eth"),
            owner,
            address(resolver),
            10000000
        );
        vm.prank(owner);
        registry.setSubnodeRecord(
            namehash("eth"),
            labelhash("public"),
            owner,
            address(resolver),
            10000000
        );

        assertEq(registry.owner(namehash("public.eth")), owner);
        assertEq(registry.resolver(namehash("public.eth")), address(resolver));
    }

    // Test the resolver setup from the constructor
    function testResolverSetupFromConstructor() public {
        assertTrue(resolver.signers(address(0x1337)));
        assertEq(resolver.url(), "https://gateway.com");
    }

    // Test updating the URL by the owner
    function testSetUrlFromOwner() public {
        vm.prank(owner);

        string memory newUrl = "https://new_gateway.com";
        resolver.updateUrl(newUrl);
        assertEq(resolver.url(), newUrl);
    }

    // Test failure in updating the URL by a non-owner
    function testSetUrlFromNonOwner_fail() public {
        string memory newUrl = "https://new_gateway.com";

        vm.prank(address(0x44));
        vm.expectRevert("Ownable: caller is not the owner");
        resolver.updateUrl(newUrl);
    }

    // Test updating the signers by the owner
    function testSetSignerFromOwner() public {
        vm.prank(owner);
        address[] memory signers = new address[](1);
        signers[0] = address(0x69420);

        bool[] memory canSign = new bool[](1);
        canSign[0] = true;

        resolver.updateSigners(signers, canSign);

        assertTrue(resolver.signers(address(0x1337)));
        assertTrue(resolver.signers(address(0x69420)));

        assertFalse(resolver.signers(address(0x42069)));
    }

    // Test failure in updating the signers by a non-owner
    function testSetSignerFromNonOwner_fail() public {
        address[] memory signers = new address[](1);
        signers[0] = address(0x69420);

        bool[] memory canSign = new bool[](1);
        canSign[0] = true;

        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(address(0x44));
        resolver.updateSigners(signers, canSign);

        assertTrue(resolver.signers(address(0x1337)));
        assertFalse(resolver.signers(address(0x69420)));
    }

    // Test removing a signer
    function testRemoveSigner() public {
        vm.prank(owner);
        address[] memory signers = new address[](1);
        signers[0] = address(0x1337);

        bool[] memory canSign = new bool[](1);
        canSign[0] = false;

        resolver.updateSigners(signers, canSign);

        assertFalse(resolver.signers(address(0x1337)));
        assertFalse(resolver.signers(address(0x69420)));
    }
}
