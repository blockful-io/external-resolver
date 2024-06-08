// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";

import "@ens-contracts/registry/ENSRegistry.sol";
import {
    PublicResolver,
    INameWrapper
} from "@ens-contracts/resolvers/PublicResolver.sol";
import "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import "@ens-contracts/utils/UniversalResolver.sol";

import "../script/Helper.sol";

contract PublicResolverTest is Test, ENSHelper {

    PublicResolver public resolver;
    ENSRegistry public registry;
    address constant owner = address(1);

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
            namehash("reverse"), labelhash("addr"), address(registrar)
        );

        resolver = new PublicResolver(
            registry, INameWrapper(owner), owner, address(registrar)
        );
        registrar.setDefaultResolver(address(resolver));

        vm.stopPrank();
    }

    function test_SetSubnodeRecord1stLevel() external {
        vm.prank(owner);
        registry.setSubnodeRecord(
            rootNode, labelhash("eth"), owner, address(resolver), 10000000
        );

        assertEq(registry.owner(namehash("eth")), owner);
        assertEq(registry.resolver(namehash("eth")), address(resolver));
    }

    function test_SetSubnodeRecord2nLevel() external {
        vm.prank(owner);
        registry.setSubnodeRecord(
            rootNode, labelhash("eth"), owner, address(resolver), 10000000
        );
        vm.prank(owner);
        registry.setSubnodeRecord(
            namehash("eth"),
            labelhash("blockful"),
            owner,
            address(resolver),
            10000000
        );

        assertEq(registry.owner(namehash("blockful.eth")), owner);
        assertEq(registry.resolver(namehash("blockful.eth")), address(resolver));
    }

    function test_Text() public {
        vm.prank(owner);
        resolver.setText(namehash("blockful.eth"), "avatar", "blockful.png");

        assertEq(
            resolver.text(namehash("blockful.eth"), "avatar"), "blockful.png"
        );
    }

    function test_Addr() public {
        vm.prank(owner);
        resolver.setAddr(namehash("blockful.eth"), owner);

        assertEq(resolver.addr(namehash("blockful.eth")), owner);
    }

    function test_AddrMultiCoin() public {
        vm.prank(owner);
        resolver.setAddr(
            namehash("blockful.eth"), uint256(60), abi.encodePacked(owner)
        );
        assertEq(
            resolver.addr(namehash("blockful.eth"), uint256(60)),
            abi.encodePacked(owner)
        );
    }

    function test_Name() public {
        vm.prank(owner);
        resolver.setName(namehash("blockful.eth"), "blockful");
        assertEq(resolver.name(namehash("blockful.eth")), "blockful");
    }

}
