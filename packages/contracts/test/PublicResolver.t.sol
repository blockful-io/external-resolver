// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console2} from "forge-std/Test.sol";
import "../src/Helper.sol";
import "@ens-contracts/registry/ENSRegistry.sol";
import {PublicResolver, INameWrapper} from "@ens-contracts/resolvers/PublicResolver.sol";
import "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";

contract PublicResolverTest is Test, ENSHelper {
    PublicResolver public resolver;

    function setUp() public {
        vm.startPrank(address(1));
        ENSRegistry registry = new ENSRegistry();
        ReverseRegistrar registrar = new ReverseRegistrar(registry);

        // .reverse
        registry.setSubnodeOwner(rootNode, labelhash("reverse"), address(1));
        // addr.reverse
        registry.setSubnodeOwner(namehash("reverse"), labelhash("addr"), address(registrar));

        resolver = new PublicResolver(registry, INameWrapper(address(1)), address(1), address(registrar));
        registrar.setDefaultResolver(address(resolver));

        // .eth
        registry.setSubnodeRecord(rootNode, labelhash("eth"), address(1), address(resolver), 100000);
        // public.eth
        registry.setSubnodeRecord(namehash("eth"), labelhash("public"), address(1), address(resolver), 100000);

        vm.stopPrank();
    }

    function test_Text() public {
        vm.prank(address(1));
        resolver.setText(namehash("public.eth"), "avatar", "blockful.png");

        assertEq(resolver.text(namehash("public.eth"), "avatar"), "blockful.png");
    }

    function test_Addr() public {
        vm.prank(address(1));
        resolver.setAddr(namehash("public.eth"), address(1));

        assertEq(resolver.addr(namehash("public.eth")), address(1));
    }

    function test_AddrMultiCoin() public {
        vm.prank(address(1));
        resolver.setAddr(namehash("public.eth"), uint256(60), abi.encodePacked(address(1)));
        assertEq(resolver.addr(namehash("public.eth"), uint256(60)), abi.encodePacked(address(1)));
    }
}
