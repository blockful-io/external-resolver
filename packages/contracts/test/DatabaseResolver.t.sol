// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";
import {
    PublicResolver,
    INameWrapper
} from "@ens-contracts/resolvers/PublicResolver.sol";
import "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import "@ens-contracts/utils/UniversalResolver.sol";

import {ENSHelper} from "../script/Helper.sol";
import {DatabaseConfig} from "../script/config/DatabaseConfig.s.sol";
import {DatabaseResolver} from "../src/DatabaseResolver.sol";
import {DatabaseResolverScript} from "../script/deploy/DatabaseResolver.s.sol";

contract DatabaseResolverTest is Test, ENSHelper {

    DatabaseResolver public resolver;
    ENSRegistry registry;
    address owner;

    // Initial setup before each test
    function setUp() public {
        owner = address(this);
        DatabaseConfig config = new DatabaseConfig(block.chainid, owner);
        (
            string memory gatewayUrl,
            uint256 gatewayTimestamp,
            address[] memory signers,
            ENSRegistry _registry
        ) = config.activeNetworkConfig();
        registry = _registry;
        string[] memory urls = new string[](1);
        urls[0] = gatewayUrl;

        resolver = new DatabaseResolver(gatewayUrl, gatewayTimestamp, signers);
    }

    // Test the resolver setup from the constructor
    function testResolverSetupFromConstructor() public {
        DatabaseConfig config = new DatabaseConfig(block.chainid, owner);
        ( /* gatewayUrl */
            , /* gatewayTimestamp */, address[] memory signers, /* registry */
        ) = config.activeNetworkConfig();
        assertTrue(resolver.isSigner(signers[0]));
        assertEq(
            resolver.gatewayUrl(), "http://127.0.0.1:3000/{sender}/{data}.json"
        );
    }

    // Test updating the URL by the owner
    function test_SetUrlFromOwner() public {
        vm.prank(owner);

        string memory newUrl = "https://new_gateway.com";
        resolver.setGatewayUrl(newUrl);
        assertEq(resolver.gatewayUrl(), newUrl);
    }

    // Test failure in updating the URL by a non-owner
    function test_Fail_SetUrlFromNonOwner() public {
        string memory newUrl = "https://new_gateway.com";

        vm.prank(address(0x44));
        vm.expectRevert("Ownable: caller is not the owner");
        resolver.setGatewayUrl(newUrl);
    }

    // Test updating the signers by the owner
    function test_SetSignerFromOwner() public {
        address[] memory new_signers = new address[](1);
        new_signers[0] = address(0x69420);

        vm.prank(owner);
        resolver.addSigners(new_signers);

        DatabaseConfig config = new DatabaseConfig(block.chainid, owner);
        ( /* gatewayUrl */
            , /* gatewayTimestamp */, address[] memory signers, /* registry */
        ) = config.activeNetworkConfig();

        assertTrue(resolver.isSigner(signers[0]));
        assertTrue(resolver.isSigner(new_signers[0]));
        assertFalse(resolver.isSigner(address(0x42069)));
    }

    // Test failure in updating the signers by a non-owner
    function test_Fail_SetSignerFromNonOwner() public {
        address[] memory new_signers = new address[](1);
        new_signers[0] = address(0x69420);

        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(address(0x44));
        resolver.addSigners(new_signers);

        DatabaseConfig config = new DatabaseConfig(block.chainid, owner);
        ( /* gatewayUrl */
            , /* gatewayTimestamp */, address[] memory signers, /* registry */
        ) = config.activeNetworkConfig();

        assertTrue(resolver.isSigner(signers[0]));
        assertFalse(resolver.isSigner(new_signers[0]));
    }

    // Test removing a signer
    function test_RemoveSigner() public {
        vm.prank(owner);
        address[] memory signers = new address[](1);
        signers[0] = address(0x1337);

        resolver.removeSigners(signers);

        assertFalse(resolver.isSigner(address(0x1337)));
        assertFalse(resolver.isSigner(address(0x69420)));
    }

}
