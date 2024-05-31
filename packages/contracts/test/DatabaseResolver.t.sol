// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import "@ens-contracts/registry/ENSRegistry.sol";
import {PublicResolver, INameWrapper} from "@ens-contracts/resolvers/PublicResolver.sol";
import "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import "@ens-contracts/utils/UniversalResolver.sol";

import "../script/Helper.sol";
import {Config} from "../script/deploy/Config.s.sol";
import {DatabaseResolver} from "../src/DatabaseResolver.sol";
import {DatabaseResolverScript} from "../script/deploy/DatabaseResolver.s.sol";

contract DatabaseResolverTest is Test, ENSHelper {
    DatabaseResolver public resolver;
    ENSRegistry public registry;
    address constant owner = address(0x1337);

    // Initial setup before each test
    function setUp() public {
        Config config = new Config(block.chainid);
        (string memory gatewayUrl,) = config.activeNetworkConfig();
        string[] memory urls = new string[](1);
        urls[0] = gatewayUrl;

        vm.startPrank(owner);
        registry = new ENSRegistry();

        new UniversalResolver(address(registry), urls);
        ReverseRegistrar registrar = new ReverseRegistrar(registry);

        // .reverse
        registry.setSubnodeOwner(rootNode, labelhash("reverse"), owner);
        // addr.reverse
        registry.setSubnodeOwner(namehash("reverse"), labelhash("addr"), address(registrar));

        // instantiating the contract the same way the deploy is done
        resolver = new DatabaseResolverScript().run();

        address[] memory signers = new address[](1);
        signers[0] = address(0x1337);
        resolver.addSigners(signers);

        registrar.setDefaultResolver(address(resolver));

        vm.stopPrank();
    }

    // Test the setSubnodeRecord function for the first level
    function test_SetSubnodeRecord1stLevel() external {
        vm.prank(owner);
        registry.setSubnodeRecord(rootNode, labelhash("eth"), owner, address(resolver), 10000000);

        assertEq(registry.owner(namehash("eth")), owner);
        assertEq(registry.resolver(namehash("eth")), address(resolver));
    }

    // Test the setSubnodeRecord function for the second level
    function test_SetSubnodeRecord2nLevel() external {
        vm.prank(owner);
        registry.setSubnodeRecord(rootNode, labelhash("eth"), owner, address(resolver), 10000000);
        vm.prank(owner);
        registry.setSubnodeRecord(namehash("eth"), labelhash("blockful"), owner, address(resolver), 10000000);

        assertEq(registry.owner(namehash("blockful.eth")), owner);
        assertEq(registry.resolver(namehash("blockful.eth")), address(resolver));
    }

    // Test the resolver setup from the constructor
    function testResolverSetupFromConstructor() public {
        assertTrue(resolver.isSigner(address(0x1337)));
        assertEq(resolver.gatewayUrl(), "http://localhost:3000/{sender}/{data}.json");
    }

    // Test updating the URL by the owner
    function testSetUrlFromOwner() public {
        vm.prank(owner);

        string memory newUrl = "https://new_gateway.com";
        resolver.setGatewayUrl(newUrl);
        assertEq(resolver.gatewayUrl(), newUrl);
    }

    // Test failure in updating the URL by a non-owner
    function testSetUrlFromNonOwner_fail() public {
        string memory newUrl = "https://new_gateway.com";

        vm.prank(address(0x44));
        vm.expectRevert("Ownable: caller is not the owner");
        resolver.setGatewayUrl(newUrl);
    }

    // Test updating the signers by the owner
    function testSetSignerFromOwner() public {
        vm.prank(owner);
        address[] memory signers = new address[](1);
        signers[0] = address(0x69420);

        resolver.addSigners(signers);

        assertTrue(resolver.isSigner(address(0x1337)));
        assertTrue(resolver.isSigner(address(0x69420)));

        assertFalse(resolver.isSigner(address(0x42069)));
    }

    // Test failure in updating the signers by a non-owner
    function testSetSignerFromNonOwner_fail() public {
        address[] memory signers = new address[](1);
        signers[0] = address(0x69420);

        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(address(0x44));
        resolver.addSigners(signers);

        assertTrue(resolver.isSigner(address(0x1337)));
        assertFalse(resolver.isSigner(address(0x69420)));
    }

    // Test removing a signer
    function testRemoveSigner() public {
        vm.prank(owner);
        address[] memory signers = new address[](1);
        signers[0] = address(0x1337);

        resolver.removeSigners(signers);

        assertFalse(resolver.isSigner(address(0x1337)));
        assertFalse(resolver.isSigner(address(0x69420)));
    }
}
