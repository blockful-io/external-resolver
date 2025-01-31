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

import {ENSHelper} from "../script/ENSHelper.sol";
import {DatabaseConfig} from "../script/config/DatabaseConfig.s.sol";
import {DatabaseResolver} from "../src/DatabaseResolver.sol";
import {DatabaseResolverScript} from "../script/deploy/DatabaseResolver.s.sol";
import {
    OffchainRegister,
    RegisterRequest,
    OffchainTransferrable
} from "../src/interfaces/WildcardWriting.sol";
import {OperationRouter} from "../src/interfaces/OperationRouter.sol";

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
            string memory graphqlUrl,
            uint256 gatewayTimestamp,
            address[] memory signers,
            ENSRegistry _registry
        ) = config.activeNetworkConfig();
        registry = _registry;
        string[] memory urls = new string[](1);
        urls[0] = gatewayUrl;

        resolver = new DatabaseResolver(
            gatewayUrl, graphqlUrl, gatewayTimestamp, signers
        );
    }

    // Test the resolver setup from the constructor
    function testResolverSetupFromConstructor() public {
        DatabaseConfig config = new DatabaseConfig(block.chainid, owner);
        (
            , // gatewayUrl
            , // graphqlUrl
            , // gatewayTimestamp
            address[] memory signers,
            // registry
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
        (
            , // gatewayUrl
            , // graphqlUrl
            , // gatewayTimestamp
            address[] memory signers, /* registry */
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
        (
            , // gatewayUrl
            , // graphqlUrl
            , // gatewayTimestamp
            address[] memory signers,
            // registry
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

    function test_SupportENSIP16Interface() public view {
        assertTrue(resolver.supportsInterface(resolver.metadata.selector));
    }

    function test_SupportWildcardWritingInterfaces() public view {
        assertTrue(
            resolver.supportsInterface(type(OffchainRegister).interfaceId)
        );
        assertTrue(
            resolver.supportsInterface(type(OffchainTransferrable).interfaceId)
        );
    }

    function test_RevertWhen_getOperationHandlerRegister() public {
        bytes memory data = abi.encodeWithSelector(
            OffchainRegister.register.selector,
            RegisterRequest({
                name: "test.eth",
                owner: msg.sender,
                duration: 0,
                secret: bytes32(0),
                extraData: new bytes(0)
            })
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                OperationRouter.OperationHandledOffchain.selector,
                OperationRouter.DomainData({
                    name: "DatabaseResolver",
                    version: "1",
                    chainId: uint64(block.chainid),
                    verifyingContract: address(resolver)
                }),
                resolver.gatewayUrl(),
                OperationRouter.MessageData({
                    data: data,
                    sender: owner,
                    expirationTimestamp: block.timestamp
                        + resolver.gatewayDatabaseTimeoutDuration()
                })
            )
        );
        resolver.getOperationHandler(data);
    }

    function test_RevertWhen_RegisterRevert() public {
        bytes memory data = abi.encodeWithSelector(
            OffchainRegister.register.selector,
            RegisterRequest({
                name: "test.eth",
                owner: msg.sender,
                duration: 0,
                secret: bytes32(0),
                extraData: new bytes(0)
            })
        );
        vm.expectRevert(
            abi.encodeWithSelector(
                OperationRouter.OperationHandledOffchain.selector,
                OperationRouter.DomainData({
                    name: "DatabaseResolver",
                    version: "1",
                    chainId: uint64(block.chainid),
                    verifyingContract: address(resolver)
                }),
                resolver.gatewayUrl(),
                OperationRouter.MessageData({
                    data: data,
                    sender: owner,
                    expirationTimestamp: block.timestamp
                        + resolver.gatewayDatabaseTimeoutDuration()
                })
            )
        );
        resolver.register(
            RegisterRequest({
                name: "test.eth",
                owner: msg.sender,
                duration: 0,
                secret: bytes32(0),
                extraData: new bytes(0)
            })
        );
    }

    function test_RevertWhen_getOperationHandlerTransferFrom() public {
        bytes memory data = abi.encodeWithSelector(
            OffchainTransferrable.transferFrom.selector,
            "test.eth",
            address(0x1234),
            address(0x5678)
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                OperationRouter.OperationHandledOffchain.selector,
                OperationRouter.DomainData({
                    name: "DatabaseResolver",
                    version: "1",
                    chainId: uint64(block.chainid),
                    verifyingContract: address(resolver)
                }),
                resolver.gatewayUrl(),
                OperationRouter.MessageData({
                    data: data,
                    sender: owner,
                    expirationTimestamp: block.timestamp
                        + resolver.gatewayDatabaseTimeoutDuration()
                })
            )
        );
        resolver.getOperationHandler(data);
    }

    function test_RevertWhen_getOperationHandlerRegisterParams() public {
        bytes memory data = abi.encodeWithSelector(
            OffchainRegister.registerParams.selector, "test.eth", uint256(0)
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                OperationRouter.OperationHandledOffchain.selector,
                OperationRouter.DomainData({
                    name: "DatabaseResolver",
                    version: "1",
                    chainId: uint64(block.chainid),
                    verifyingContract: address(resolver)
                }),
                resolver.gatewayUrl(),
                OperationRouter.MessageData({
                    data: data,
                    sender: owner,
                    expirationTimestamp: block.timestamp
                        + resolver.gatewayDatabaseTimeoutDuration()
                })
            )
        );
        resolver.getOperationHandler(data);
    }

    function test_RevertWhen_RegisterParamsRevert() public {
        bytes memory data = abi.encodeWithSelector(
            OffchainRegister.registerParams.selector, "test.eth", uint256(0)
        );
        vm.expectRevert(
            abi.encodeWithSelector(
                OperationRouter.OperationHandledOffchain.selector,
                OperationRouter.DomainData({
                    name: "DatabaseResolver",
                    version: "1",
                    chainId: uint64(block.chainid),
                    verifyingContract: address(resolver)
                }),
                resolver.gatewayUrl(),
                OperationRouter.MessageData({
                    data: data,
                    sender: owner,
                    expirationTimestamp: block.timestamp
                        + resolver.gatewayDatabaseTimeoutDuration()
                })
            )
        );
        resolver.registerParams("test.eth", uint256(0));
    }

    function test_RevertWhen_TransferFromRevert() public {
        bytes memory data = abi.encodeWithSelector(
            OffchainTransferrable.transferFrom.selector,
            "test.eth",
            address(0x1234),
            address(0x5678)
        );
        vm.expectRevert(
            abi.encodeWithSelector(
                OperationRouter.OperationHandledOffchain.selector,
                OperationRouter.DomainData({
                    name: "DatabaseResolver",
                    version: "1",
                    chainId: uint64(block.chainid),
                    verifyingContract: address(resolver)
                }),
                resolver.gatewayUrl(),
                OperationRouter.MessageData({
                    data: data,
                    sender: owner,
                    expirationTimestamp: block.timestamp
                        + resolver.gatewayDatabaseTimeoutDuration()
                })
            )
        );
        resolver.transferFrom("test.eth", address(0x1234), address(0x5678));
    }

    function test_RevertWhen_getOperationHandlerSetText() public {
        bytes memory data = abi.encodeWithSelector(
            resolver.setText.selector, bytes32(0), "key", "value"
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                OperationRouter.OperationHandledOffchain.selector,
                OperationRouter.DomainData({
                    name: "DatabaseResolver",
                    version: "1",
                    chainId: uint64(block.chainid),
                    verifyingContract: address(resolver)
                }),
                resolver.gatewayUrl(),
                OperationRouter.MessageData({
                    data: data,
                    sender: owner,
                    expirationTimestamp: block.timestamp
                        + resolver.gatewayDatabaseTimeoutDuration()
                })
            )
        );
        resolver.getOperationHandler(data);
    }

    function test_RevertWhen_SetTextRevert() public {
        bytes memory data = abi.encodeWithSelector(
            resolver.setText.selector, bytes32(0), "key", "value"
        );
        vm.expectRevert(
            abi.encodeWithSelector(
                OperationRouter.OperationHandledOffchain.selector,
                OperationRouter.DomainData({
                    name: "DatabaseResolver",
                    version: "1",
                    chainId: uint64(block.chainid),
                    verifyingContract: address(resolver)
                }),
                resolver.gatewayUrl(),
                OperationRouter.MessageData({
                    data: data,
                    sender: owner,
                    expirationTimestamp: block.timestamp
                        + resolver.gatewayDatabaseTimeoutDuration()
                })
            )
        );
        resolver.setText(bytes32(0), "key", "value");
    }

    function test_RevertWhen_getOperationHandlerSetAddr() public {
        bytes memory data = abi.encodeWithSelector(
            bytes4(keccak256("setAddr(bytes32,address)")),
            bytes32(0),
            address(0x1234)
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                OperationRouter.OperationHandledOffchain.selector,
                OperationRouter.DomainData({
                    name: "DatabaseResolver",
                    version: "1",
                    chainId: uint64(block.chainid),
                    verifyingContract: address(resolver)
                }),
                resolver.gatewayUrl(),
                OperationRouter.MessageData({
                    data: data,
                    sender: owner,
                    expirationTimestamp: block.timestamp
                        + resolver.gatewayDatabaseTimeoutDuration()
                })
            )
        );
        resolver.getOperationHandler(data);
    }

    function test_RevertWhen_SetAddrRevert() public {
        bytes memory data = abi.encodeWithSelector(
            bytes4(keccak256("setAddr(bytes32,address)")),
            bytes32(0),
            address(0x1234)
        );
        vm.expectRevert(
            abi.encodeWithSelector(
                OperationRouter.OperationHandledOffchain.selector,
                OperationRouter.DomainData({
                    name: "DatabaseResolver",
                    version: "1",
                    chainId: uint64(block.chainid),
                    verifyingContract: address(resolver)
                }),
                resolver.gatewayUrl(),
                OperationRouter.MessageData({
                    data: data,
                    sender: owner,
                    expirationTimestamp: block.timestamp
                        + resolver.gatewayDatabaseTimeoutDuration()
                })
            )
        );
        resolver.setAddr(bytes32(0), address(0x1234));
    }

    function test_RevertWhen_getOperationHandlerSetAddrWithCoinType() public {
        bytes memory data = abi.encodeWithSelector(
            bytes4(keccak256("setAddr(bytes32,uint256,bytes)")),
            bytes32(0),
            uint256(60),
            new bytes(0)
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                OperationRouter.OperationHandledOffchain.selector,
                OperationRouter.DomainData({
                    name: "DatabaseResolver",
                    version: "1",
                    chainId: uint64(block.chainid),
                    verifyingContract: address(resolver)
                }),
                resolver.gatewayUrl(),
                OperationRouter.MessageData({
                    data: data,
                    sender: owner,
                    expirationTimestamp: block.timestamp
                        + resolver.gatewayDatabaseTimeoutDuration()
                })
            )
        );
        resolver.getOperationHandler(data);
    }

    function test_RevertWhen_SetAddrWithCoinTypeRevert() public {
        bytes memory data = abi.encodeWithSelector(
            bytes4(keccak256("setAddr(bytes32,uint256,bytes)")),
            bytes32(0),
            uint256(60),
            new bytes(0)
        );
        vm.expectRevert(
            abi.encodeWithSelector(
                OperationRouter.OperationHandledOffchain.selector,
                OperationRouter.DomainData({
                    name: "DatabaseResolver",
                    version: "1",
                    chainId: uint64(block.chainid),
                    verifyingContract: address(resolver)
                }),
                resolver.gatewayUrl(),
                OperationRouter.MessageData({
                    data: data,
                    sender: owner,
                    expirationTimestamp: block.timestamp
                        + resolver.gatewayDatabaseTimeoutDuration()
                })
            )
        );
        resolver.setAddr(bytes32(0), uint256(60), new bytes(0));
    }

    function test_RevertWhen_getOperationHandlerSetContenthash() public {
        bytes memory data = abi.encodeWithSelector(
            resolver.setContenthash.selector, bytes32(0), new bytes(0)
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                OperationRouter.OperationHandledOffchain.selector,
                OperationRouter.DomainData({
                    name: "DatabaseResolver",
                    version: "1",
                    chainId: uint64(block.chainid),
                    verifyingContract: address(resolver)
                }),
                resolver.gatewayUrl(),
                OperationRouter.MessageData({
                    data: data,
                    sender: owner,
                    expirationTimestamp: block.timestamp
                        + resolver.gatewayDatabaseTimeoutDuration()
                })
            )
        );
        resolver.getOperationHandler(data);
    }

    function test_RevertWhen_SetContenthashRevert() public {
        bytes memory data = abi.encodeWithSelector(
            resolver.setContenthash.selector, bytes32(0), new bytes(0)
        );
        vm.expectRevert(
            abi.encodeWithSelector(
                OperationRouter.OperationHandledOffchain.selector,
                OperationRouter.DomainData({
                    name: "DatabaseResolver",
                    version: "1",
                    chainId: uint64(block.chainid),
                    verifyingContract: address(resolver)
                }),
                resolver.gatewayUrl(),
                OperationRouter.MessageData({
                    data: data,
                    sender: owner,
                    expirationTimestamp: block.timestamp
                        + resolver.gatewayDatabaseTimeoutDuration()
                })
            )
        );
        resolver.setContenthash(bytes32(0), new bytes(0));
    }

}
