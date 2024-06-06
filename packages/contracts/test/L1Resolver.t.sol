// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "forge-std/console.sol";
import {Test} from "forge-std/Test.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import {ENS} from "@ens-contracts/registry/ENS.sol";
import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";
import {INameWrapper} from "@ens-contracts/wrapper/INameWrapper.sol";
import {BytesUtils} from "@ens-contracts/dnssec-oracle/BytesUtils.sol";
import {HexUtils} from "@ens-contracts/utils/HexUtils.sol";
import {NameEncoder} from "@ens-contracts/utils/NameEncoder.sol";
import {IAddrResolver} from "@ens-contracts/resolvers/profiles/IAddrResolver.sol";
import {IAddressResolver} from "@ens-contracts/resolvers/profiles/IAddressResolver.sol";
import {ITextResolver} from "@ens-contracts/resolvers/profiles/ITextResolver.sol";
import {IContentHashResolver} from "@ens-contracts/resolvers/profiles/IContentHashResolver.sol";

import {L1Resolver} from "../src/L1Resolver.sol";
import {L1Verifier} from "../src/evmgateway/L1Verifier.sol";
import {IEVMVerifier} from "../src/evmgateway/IEVMVerifier.sol";
import {EVMFetcher} from "../src/evmgateway/EVMFetcher.sol";
import {IWriteDeferral} from "../src/IWriteDeferral.sol";
import "../script/Helper.sol";

contract L1ResolverTest is Test, ENSHelper, IWriteDeferral {
    ENS register;
    IEVMVerifier verifier;
    L1Resolver l1Resolver;

    bytes dnsName;
    bytes32 testNode = namehash("test.eth");

    function setUp() public {
        register = new ENSRegistry();
        string[] memory urls = new string[](1);
        urls[0] = "http://localhost:3000/{sender}/{data}.json";
        verifier = new L1Verifier(urls);
        l1Resolver = new L1Resolver(31337, verifier, register, INameWrapper(msg.sender));
        (dnsName,) = NameEncoder.dnsEncodeName("test.eth");

        register.setSubnodeOwner(rootNode, labelhash("eth"), address(this));
        register.setSubnodeOwner(namehash("eth"), labelhash("test"), address(this));
    }

    function test_ConstructorChainId() public {
        assertEq(l1Resolver.chainId(), 31337);
    }

    function test_SetChainId() public {
        uint32 newChainId = 137;
        l1Resolver.setChainId(newChainId);
        assertEq(l1Resolver.chainId(), newChainId);
    }

    function test_SetTarget() public {
        address target = address(0x123);
        vm.expectEmit(true, true, true, true);
        emit L2HandlerContractAddressChanged(31337, address(0), target);
        l1Resolver.setTarget(dnsName, target);
    }

    function test_RevertWhen_SetTargetUnauthorizedOwner() public {
        address target = address(0x123);
        vm.expectRevert();
        vm.prank(address(0x2024));
        l1Resolver.setTarget(dnsName, target);
    }

    function test_GetExistingTarget() public {
        address target = address(0x123);
        l1Resolver.setTarget(dnsName, target);
        (, address actual) = l1Resolver.getTarget(dnsName);
        assertEq(actual, target);
    }

    function test_GetExistingTargetSubdomain() public {
        address expected = address(0x123);

        (bytes memory ethNode,) = NameEncoder.dnsEncodeName("eth");
        l1Resolver.setTarget(ethNode, address(0x456));

        (bytes memory blockfulNode,) = NameEncoder.dnsEncodeName("blockful.eth");
        l1Resolver.setTarget(blockfulNode, expected);

        (, address actual) = l1Resolver.getTarget(blockfulNode);
        assertEq(actual, expected);
    }

    function test_GetExistingTargetSubdomainFromParent() public {
        address expected = address(0x123);

        (bytes memory ethNode,) = NameEncoder.dnsEncodeName("eth");
        l1Resolver.setTarget(ethNode, expected);

        (bytes memory blockfulNode,) = NameEncoder.dnsEncodeName("blockful.eth");
        (, address actual) = l1Resolver.getTarget(blockfulNode);
        assertEq(actual, expected);
    }

    function test_GetExistingTargetSubdomainFromParentMultiplesLevels() public {
        address expected = address(0x123);

        (bytes memory ethNode,) = NameEncoder.dnsEncodeName("eth");
        l1Resolver.setTarget(ethNode, expected);

        (bytes memory blockfulNode,) = NameEncoder.dnsEncodeName("optimizing.human.cordination.blockful.eth");
        (, address actual) = l1Resolver.getTarget(blockfulNode);
        assertEq(actual, expected);
    }

    function test_GetNotExistingTarget() public {
        (, address actual) = l1Resolver.getTarget(dnsName);
        assertEq(actual, address(0));
    }

    function test_RevertWhen_SetAddr() public {
        address target = address(0x456);
        l1Resolver.setTarget(dnsName, target);
        vm.expectRevert(abi.encodeWithSelector(IWriteDeferral.StorageHandledByL2.selector, 31337, target));
        l1Resolver.setAddr(dnsName, address(0x123));
    }

    function test_RevertWhen_GetAddr() public {
        vm.expectRevert();
        l1Resolver.resolve(dnsName, abi.encodeWithSelector(IAddrResolver.addr.selector, address(0)));
    }

    function test_RevertWhen_SetText() public {
        address target = address(0x456);
        l1Resolver.setTarget(dnsName, target);

        vm.expectRevert(abi.encodeWithSelector(IWriteDeferral.StorageHandledByL2.selector, 31337, target));
        l1Resolver.setText(dnsName, "com.twitter", "@blockful");
    }

    function test_RevertWhen_GetText() public {
        vm.expectRevert();
        l1Resolver.resolve(dnsName, abi.encodeWithSelector(ITextResolver.text.selector, testNode, "com.twitter"));
    }

    function test_RevertWhen_SetContentHash() public {
        address target = address(0x456);
        l1Resolver.setTarget(dnsName, target);

        vm.expectRevert(abi.encodeWithSelector(IWriteDeferral.StorageHandledByL2.selector, 31337, target));
        l1Resolver.setContenthash(dnsName, "contenthash");
    }

    function test_RevertWhen_GetContentHash() public {
        vm.expectRevert();
        l1Resolver.resolve(dnsName, abi.encodeWithSelector(IContentHashResolver.contenthash.selector, testNode));
    }
}
