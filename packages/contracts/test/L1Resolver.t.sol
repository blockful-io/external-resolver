// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IAddrResolver} from
    "@ens-contracts/resolvers/profiles/IAddrResolver.sol";
import {AddrResolver} from "@ens-contracts/resolvers/profiles/AddrResolver.sol";
import {TextResolver} from "@ens-contracts/resolvers/profiles/TextResolver.sol";
import {ContentHashResolver} from
    "@ens-contracts/resolvers/profiles/ContentHashResolver.sol";
import {IAddressResolver} from
    "@ens-contracts/resolvers/profiles/IAddressResolver.sol";
import {IExtendedResolver} from
    "@ens-contracts/resolvers/profiles/IExtendedResolver.sol";

import {OffchainRegister} from "../src/interfaces/WildcardWriting.sol";
import {IEVMVerifier} from "../src/evmgateway/IEVMVerifier.sol";
import {L1Verifier} from "../src/evmgateway/L1Verifier.sol";
import {L1Resolver} from "../src/L1Resolver.sol";
import {IWriteDeferral} from "../src/interfaces/IWriteDeferral.sol";
import {ENSHelper} from "../script/ENSHelper.sol";
import {ENSIP16} from "../src/ENSIP16.sol";

contract L1ResolverTest is Test, ENSHelper {

    L1Resolver l1Resolver;
    uint32 constant chainId = 31337;
    address constant TARGET_RESOLVER = address(2);
    address constant TARGET_REGISTRAR = address(3);

    function setUp() public {
        string[] memory urls = new string[](1);
        urls[0] = "http://localhost:3000/{sender}/{data}.json";

        IEVMVerifier verifier = new L1Verifier(urls);
        l1Resolver = new L1Resolver(
            chainId, TARGET_RESOLVER, TARGET_REGISTRAR, verifier, urls[0]
        );
    }

    function test_ConstructorChainId() public view {
        assertEq(l1Resolver.chainId(), chainId);
    }

    function test_OwnerCanSetTarget() public {
        address expected = address(0x123);
        l1Resolver.setTarget(l1Resolver.TARGET_RESOLVER(), expected);
        address actual = l1Resolver.targets(l1Resolver.TARGET_RESOLVER());
        assertEq(actual, expected);
    }

    function test_EmitEventOnSetTarget() public {
        address target = address(0x123);
        vm.expectEmit(true, true, true, false);
        emit IWriteDeferral.L2HandlerContractAddressChanged(
            chainId, TARGET_RESOLVER, target
        );
        l1Resolver.setTarget(l1Resolver.TARGET_RESOLVER(), target);
    }

    function test_RevertWhen_UnauthorizedSetTarget() public {
        address target = address(0x123);

        bytes32 node = namehash("test.eth");
        vm.prank(address(0x2024));
        vm.expectRevert(bytes("Ownable: caller is not the owner"));
        l1Resolver.setTarget(node, target);
    }

    //////// WRITE PARAMS TESTS ////////

    function test_WriteParamsRegister() public {
        bytes memory name = "test.eth";
        bytes memory data = abi.encodeWithSelector(
            OffchainRegister.register.selector,
            name,
            address(0),
            0,
            bytes32(0),
            address(0),
            new bytes[](0),
            false,
            0
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                IWriteDeferral.StorageHandledByL2.selector,
                chainId,
                TARGET_REGISTRAR
            )
        );
        l1Resolver.writeParams(name, data);
    }

    function test_WriteParamsSetAddr() public {
        bytes memory name = "test.eth";
        bytes memory data = abi.encodeWithSelector(
            bytes4(keccak256("setAddr(bytes32,address)")),
            bytes32(0),
            address(0)
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                IWriteDeferral.StorageHandledByL2.selector,
                chainId,
                TARGET_RESOLVER
            )
        );
        l1Resolver.writeParams(name, data);
    }

    function test_WriteParamsSetAddrWithCoinType() public {
        bytes memory name = "test.eth";
        bytes memory data = abi.encodeWithSelector(
            bytes4(keccak256("setAddr(bytes32,uint256,bytes)")),
            bytes32(0),
            uint256(0),
            new bytes(0)
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                IWriteDeferral.StorageHandledByL2.selector,
                chainId,
                TARGET_RESOLVER
            )
        );
        l1Resolver.writeParams(name, data);
    }

    function test_WriteParamsSetText() public {
        bytes memory name = "test.eth";
        bytes memory data = abi.encodeWithSelector(
            bytes4(keccak256("setText(bytes32,string,string)")),
            bytes32(0),
            "",
            ""
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                IWriteDeferral.StorageHandledByL2.selector,
                chainId,
                TARGET_RESOLVER
            )
        );
        l1Resolver.writeParams(name, data);
    }

    function test_WriteParamsSetContenthash() public {
        bytes memory name = "test.eth";
        bytes memory data = abi.encodeWithSelector(
            bytes4(keccak256("setContenthash(bytes32,bytes)")),
            bytes32(0),
            new bytes(0)
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                IWriteDeferral.StorageHandledByL2.selector,
                chainId,
                TARGET_RESOLVER
            )
        );
        l1Resolver.writeParams(name, data);
    }

    function test_WriteParamsUnsupportedFunction() public {
        bytes memory name = "test.eth";
        bytes memory data = abi.encodeWithSelector(
            bytes4(keccak256("unsupportedFunction()")), bytes32(0)
        );

        vm.expectRevert(L1Resolver.FunctionNotSupported.selector);
        l1Resolver.writeParams(name, data);
    }

    function test_RevertWhen_GetAddr() public {
        vm.expectRevert();
        l1Resolver.resolve(
            bytes("test.eth"),
            abi.encodeWithSelector(IAddrResolver.addr.selector, bytes32(0))
        );
    }

    function test_RevertWhen_SetText() public {
        address target = address(0x456);
        l1Resolver.setTarget(l1Resolver.TARGET_RESOLVER(), target);

        vm.expectRevert(
            abi.encodeWithSelector(
                IWriteDeferral.StorageHandledByL2.selector, chainId, target
            )
        );
        l1Resolver.setText(bytes32(0), "com.twitter", "@blockful");
    }

    function test_RevertWhen_GetText() public {
        vm.expectRevert();
        l1Resolver.resolve(
            bytes("test.eth"),
            abi.encodeWithSelector(
                L1Resolver.text.selector, bytes32(0), "com.twitter"
            )
        );
    }

    function test_RevertWhen_SetContentHash() public {
        address target = address(0x456);
        l1Resolver.setTarget(l1Resolver.TARGET_RESOLVER(), target);

        vm.expectRevert(
            abi.encodeWithSelector(
                IWriteDeferral.StorageHandledByL2.selector, chainId, target
            )
        );
        l1Resolver.setContenthash(bytes32(0), bytes("contenthash"));
    }

    function test_RevertWhen_GetContentHash() public {
        vm.expectRevert();
        l1Resolver.resolve(
            bytes("test.eth"),
            abi.encodeWithSelector(L1Resolver.contenthash.selector, bytes32(0))
        );
    }

    function test_OwnerCanSetAddr() public {
        address target = address(0x123);
        l1Resolver.setTarget(l1Resolver.TARGET_RESOLVER(), target);
        vm.expectRevert(
            abi.encodeWithSelector(
                IWriteDeferral.StorageHandledByL2.selector, chainId, target
            )
        );
        l1Resolver.setAddr(bytes32(0), address(0x456));
    }

    function test_RevertWhen_NonOwnerSetAddr() public {
        address target = address(0x123);
        l1Resolver.setTarget(l1Resolver.TARGET_RESOLVER(), target);
        vm.prank(address(0x2024));
        vm.expectRevert(
            abi.encodeWithSelector(
                IWriteDeferral.StorageHandledByL2.selector, chainId, target
            )
        );
        l1Resolver.setAddr(bytes32(0), address(0x456));
    }

    function test_OwnerCanSetMetadataUrl() public {
        string memory newUrl = "https://newurl.com/{sender}/{data}.json";
        l1Resolver.setMetadataUrl(newUrl);
    }

    function test_RevertWhen_NonOwnerSetMetadataUrl() public {
        string memory newUrl = "https://newurl.com/{sender}/{data}.json";
        vm.prank(address(0x2024));
        vm.expectRevert("Ownable: caller is not the owner");
        l1Resolver.setMetadataUrl(newUrl);
    }

    function test_OwnerCanSetRandomTarget() public {
        bytes32 key = keccak256("test");
        address newTarget = address(0x789);
        l1Resolver.setTarget(key, newTarget);
        assertEq(l1Resolver.targets(key), newTarget);
    }

    function test_RevertWhen_NonOwnerSetRandomTarget() public {
        bytes32 key = keccak256("test");
        address newTarget = address(0x789);
        vm.prank(address(0x2024));
        vm.expectRevert("Ownable: caller is not the owner");
        l1Resolver.setTarget(key, newTarget);
    }

    function test_SupportsInterface() public view {
        assertTrue(
            l1Resolver.supportsInterface(type(IExtendedResolver).interfaceId)
        );
        assertTrue(
            l1Resolver.supportsInterface(type(IWriteDeferral).interfaceId)
        );
        assertTrue(l1Resolver.supportsInterface(type(IERC165).interfaceId));
        assertTrue(l1Resolver.supportsInterface(type(ENSIP16).interfaceId));
        assertTrue(l1Resolver.supportsInterface(type(AddrResolver).interfaceId));
        assertTrue(l1Resolver.supportsInterface(type(TextResolver).interfaceId));
        assertTrue(
            l1Resolver.supportsInterface(type(ContentHashResolver).interfaceId)
        );
    }

}
