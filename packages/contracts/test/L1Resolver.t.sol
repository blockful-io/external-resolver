// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";

// import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
// import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";
// import {INameWrapper} from "@ens-contracts/wrapper/INameWrapper.sol";
// import {BytesUtils} from "@ens-contracts/utils/BytesUtils.sol";
// import {HexUtils} from "@ens-contracts/utils/HexUtils.sol";
// import {NameEncoder} from "@ens-contracts/utils/NameEncoder.sol";
// import {IAddrResolver} from
//     "@ens-contracts/resolvers/profiles/IAddrResolver.sol";
// import {IAddressResolver} from
//     "@ens-contracts/resolvers/profiles/IAddressResolver.sol";
// import {ITextResolver} from
//     "@ens-contracts/resolvers/profiles/ITextResolver.sol";
// import {IContentHashResolver} from
//     "@ens-contracts/resolvers/profiles/IContentHashResolver.sol";
// import {NameWrapper} from "@ens-contracts/wrapper/NameWrapper.sol";
// import {IBaseRegistrar} from "@ens-contracts/ethregistrar/IBaseRegistrar.sol";
// import {IMetadataService} from "@ens-contracts/wrapper/IMetadataService.sol";
// import {ReverseRegistrar} from
//     "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";

// import {L1Resolver} from "../src/L1Resolver.sol";
// import {L1Verifier} from "../src/evmgateway/L1Verifier.sol";
// import {IEVMVerifier} from "../src/evmgateway/IEVMVerifier.sol";
// import {EVMFetcher} from "../src/evmgateway/EVMFetcher.sol";
// import {IWriteDeferral} from "../src/interfaces/IWriteDeferral.sol";
// import {ENSHelper} from "../script/ENSHelper.sol";

// contract L1ResolverTest is Test, ENSHelper, IWriteDeferral {
// ENSRegistry registry;
// IEVMVerifier verifier;
// L1Resolver l1Resolver;
// uint32 chainId;

// bytes dnsName;
// bytes32 testNode;

// function setUp() public {
//     chainId = 31337;
//     (dnsName, testNode) = NameEncoder.dnsEncodeName("test.eth");

//     registry = new ENSRegistry();
//     string[] memory urls = new string[](1);
//     urls[0] = "http://localhost:3000/{sender}/{data}.json";

//     ReverseRegistrar registrar = new ReverseRegistrar(registry);
//     // .reverse
//     registry.setSubnodeOwner(
//         rootNode, labelhash("reverse"), address(registrar)
//     );
//     // addr.reverse
//     vm.prank(address(registrar));
//     registry.setSubnodeOwner(
//         namehash("reverse"), labelhash("addr"), address(registrar)
//     );

//     NameWrapper nameWrap = new NameWrapper(
//         registry,
//         IBaseRegistrar(address(registrar)),
//         IMetadataService(msg.sender)
//     );

//     verifier = new L1Verifier(urls);
//     l1Resolver = new L1Resolver(chainId, verifier, registry, nameWrap);

//     registry.setSubnodeOwner(rootNode, labelhash("eth"), address(this));
//     registry.setSubnodeOwner(
//         namehash("eth"), labelhash("test"), address(this)
//     );
// }

// function test_ConstructorChainId() public {
//     assertEq(l1Resolver.chainId(), chainId);
// }

// function test_SetChainId() public {
//     uint32 newChainId = 137;
//     l1Resolver.setChainId(newChainId);
//     assertEq(l1Resolver.chainId(), newChainId);
// }

// function test_OwnerCanSetTarget() public {
//     address target = address(0x123);
//     l1Resolver.setTarget(testNode, target);
//     (, address actual,) = l1Resolver.getTarget(dnsName);
//     assertEq(actual, target);
// }

// function test_EmitEventOnSetTarget() public {
//     address target = address(0x123);
//     vm.expectEmit(true, true, true, true);
//     emit L2HandlerContractAddressChanged(chainId, address(0), target);
//     l1Resolver.setTarget(testNode, target);
// }

// function test_RevertWhen_UnauthorizedSetTarget() public {
//     address target = address(0x123);
//     vm.prank(address(0x2024));
//     vm.expectRevert(
//         abi.encodeWithSelector(
//             L1Resolver.L1Resolver__ForbiddenAction.selector, testNode
//         )
//     );
//     l1Resolver.setTarget(testNode, target);
// }

// function test_EmitEventOnSetChainId() public {
//     uint32 newChainId = 137;
//     vm.expectEmit(true, true, true, true);
//     emit L2HandlerDefaultChainIdChanged(chainId, newChainId);
//     l1Resolver.setChainId(newChainId);
// }

// function test_SetTarget() public {
//     address target = address(0x123);
//     vm.expectEmit(true, true, true, true);
//     emit L2HandlerContractAddressChanged(chainId, address(0), target);
//     l1Resolver.setTarget(testNode, target);
// }

// function test_RevertWhen_SetTargetUnauthorizedOwner() public {
//     address target = address(0x123);
//     vm.expectRevert();
//     vm.prank(address(0x2024));
//     l1Resolver.setTarget(testNode, target);
// }

// function test_GetExistingTarget() public {
//     address target = address(0x123);
//     l1Resolver.setTarget(testNode, target);
//     (, address actual,) = l1Resolver.getTarget(dnsName);
//     assertEq(actual, target);
// }

// function test_GetExistingTargetSubdomain() public {
//     address expected = address(0x123);

//     bytes32 ethNode = namehash("eth");
//     l1Resolver.setTarget(ethNode, address(0x456));

//     bytes32 blockfulNode = namehash("blockful.eth");
//     l1Resolver.setTarget(blockfulNode, expected);

//     (bytes memory dnsBlockful,) = NameEncoder.dnsEncodeName("blockful.eth");
//     (, address actual,) = l1Resolver.getTarget(dnsBlockful);
//     assertEq(actual, expected);
// }

// function test_GetExistingTargetSubdomainFromParent() public {
//     address expected = address(0x123);

//     bytes32 ethNode = namehash("eth");
//     l1Resolver.setTarget(ethNode, expected);

//     (bytes memory blockfulNode,) = NameEncoder.dnsEncodeName("blockful.eth");
//     (, address actual,) = l1Resolver.getTarget(blockfulNode);
//     assertEq(actual, expected);
// }

// function test_GetExistingTargetSubdomainFromParentMultiplesLevels()
//     public
// {
//     address expected = address(0x123);

//     bytes32 ethNode = namehash("eth");
//     l1Resolver.setTarget(ethNode, expected);

//     (bytes memory blockfulNode,) = NameEncoder.dnsEncodeName(
//         "optimizing.human.cordination.blockful.eth"
//     );
//     (, address actual,) = l1Resolver.getTarget(blockfulNode);
//     assertEq(actual, expected);
// }

// function test_GetNotExistingTarget() public {
//     (, address actual,) = l1Resolver.getTarget(dnsName);
//     assertEq(actual, address(0));
// }

// function test_RevertWhen_SetAddr() public {
//     address target = address(0x456);
//     l1Resolver.setTarget(testNode, target);
//     vm.expectRevert(
//         abi.encodeWithSelector(
//             IWriteDeferral.StorageHandledByL2.selector, 31337, target
//         )
//     );
//     l1Resolver.setAddr(dnsName, address(0x123));
// }

// function test_RevertWhen_GetAddr() public {
//     vm.expectRevert();
//     l1Resolver.resolve(
//         dnsName,
//         abi.encodeWithSelector(IAddrResolver.addr.selector, address(0))
//     );
// }

// function test_RevertWhen_SetText() public {
//     address target = address(0x456);
//     l1Resolver.setTarget(testNode, target);

//     vm.expectRevert(
//         abi.encodeWithSelector(
//             IWriteDeferral.StorageHandledByL2.selector, 31337, target
//         )
//     );
//     l1Resolver.setText(dnsName, "com.twitter", "@blockful");
// }

// function test_RevertWhen_GetText() public {
//     vm.expectRevert();
//     l1Resolver.resolve(
//         dnsName,
//         abi.encodeWithSelector(
//             ITextResolver.text.selector, testNode, "com.twitter"
//         )
//     );
// }

// function test_RevertWhen_SetContentHash() public {
//     address target = address(0x456);
//     l1Resolver.setTarget(testNode, target);

//     vm.expectRevert(
//         abi.encodeWithSelector(
//             IWriteDeferral.StorageHandledByL2.selector, 31337, target
//         )
//     );
//     l1Resolver.setContenthash(dnsName, "contenthash");
// }

// function test_RevertWhen_GetContentHash() public {
//     vm.expectRevert();
//     l1Resolver.resolve(
//         dnsName,
//         abi.encodeWithSelector(
//             IContentHashResolver.contenthash.selector, testNode
//         )
//     );
// }

// function test_registerDomain() public {
//     address expected = address(0x42);
//     l1Resolver.register(dnsName, expected);
//     (, address actual,) = l1Resolver.getTarget(dnsName);
//     assertEq(expected, actual);
// }

// function test_registerDomainOwnedOnChainByOwner() public {
//     registry.setSubnodeOwner(
//         namehash("eth"), labelhash("owned"), address(this)
//     );

//     (bytes memory owned, bytes32 expectedNode) =
//         NameEncoder.dnsEncodeName("owned.eth");
//     address expected = address(0x281);
//     l1Resolver.register(owned, expected);

//     (bytes32 actualNode, address actual,) = l1Resolver.getTarget(owned);
//     assertEq(expected, actual);
//     assertEq(expectedNode, actualNode);
// }

// function test_registerDomainOwnedOnChainBySomeoneElse() public {
//     registry.setSubnodeOwner(
//         namehash("eth"), labelhash("owned"), address(0x999)
//     );

//     (bytes memory owned, bytes32 node) =
//         NameEncoder.dnsEncodeName("owned.eth");
//     vm.expectRevert(
//         abi.encodeWithSelector(
//             L1Resolver.L1Resolver__UnavailableDomain.selector, node
//         )
//     );
//     l1Resolver.register(owned, address(0x281));
// }

// function test_registerSubdomain() public {
//     address expected = address(0x42);
//     l1Resolver.register(dnsName, expected);
//     (bytes memory subdomain,) =
//         NameEncoder.dnsEncodeName("subdomain.test.eth");
//     l1Resolver.register(subdomain, expected);

//     (bytes32 node, address actual,) = l1Resolver.getTarget(subdomain);
//     assertEq(expected, actual);
//     assertEq(node, namehash("subdomain.test.eth"));
// }

// function test_RevertIf_registerDomainDuplicated() public {
//     address expected = address(0x42);
//     l1Resolver.register(dnsName, expected);
//     (bytes32 node,,) = l1Resolver.getTarget(dnsName);

//     vm.expectRevert(
//         abi.encodeWithSelector(
//             L1Resolver.L1Resolver__UnavailableDomain.selector, node
//         )
//     );
//     l1Resolver.register(dnsName, address(0x24));

//     (, address actual,) = l1Resolver.getTarget(dnsName);
//     assertEq(expected, actual);
// }

// function test_setOwnerRegisteredDomain() public {
//     address expected = address(0x42);
//     l1Resolver.register(dnsName, expected);

//     vm.expectRevert(
//         abi.encodeWithSelector(
//             IWriteDeferral.StorageHandledByL2.selector, chainId, expected
//         )
//     );
//     l1Resolver.setOwner(dnsName, address(this));
// }

// function test_ReverIf_setOwnerUnregisteredDomain() public {
//     vm.expectRevert(
//         abi.encodeWithSelector(
//             L1Resolver.L1Resolver__DomainNotFound.selector, testNode
//         )
//     );
//     l1Resolver.setOwner(dnsName, address(this));
// }

// function test_OwnerCanRegisterDomain() public {
//     address expected = address(0x42);
//     l1Resolver.register(dnsName, expected);
//     (, address actual,) = l1Resolver.getTarget(dnsName);
//     assertEq(expected, actual);
// }

// function test_RevertWhen_NonOwnerRegisterDomain() public {
//     address expected = address(0x42);
//     vm.prank(address(0x2024));
//     vm.expectRevert();
//     l1Resolver.register(dnsName, expected);
// }

// function test_OwnerCanSetAddr() public {
//     address target = address(0x123);
//     l1Resolver.setTarget(testNode, target);
//     vm.expectRevert(
//         abi.encodeWithSelector(
//             IWriteDeferral.StorageHandledByL2.selector, 31337, target
//         )
//     );
//     l1Resolver.setAddr(dnsName, address(0x456));
// }

// function test_RevertWhen_NonOwnerSetAddr() public {
//     address target = address(0x123);
//     l1Resolver.setTarget(testNode, target);
//     vm.prank(address(0x2024));
//     vm.expectRevert(
//         abi.encodeWithSelector(
//             IWriteDeferral.StorageHandledByL2.selector, 31337, target
//         )
//     );
//     l1Resolver.setAddr(dnsName, address(0x456));
// }
// }
