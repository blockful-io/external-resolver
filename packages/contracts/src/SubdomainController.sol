// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {INameWrapper} from "@ens-contracts/wrapper/INameWrapper.sol";
import {ENSRegistry} from "@ens-contracts/registry/ENSRegistry.sol";
import {Resolver} from "@ens-contracts/resolvers/Resolver.sol";
import {BytesUtils} from "@ens-contracts/utils/BytesUtils.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

import {ENSHelper} from "../script/ENSHelper.sol";
import {
    OffchainRegister, RegisterRequest
} from "./interfaces/WildcardWriting.sol";

contract SubdomainController is IERC165, OffchainRegister, ENSHelper {

    using BytesUtils for bytes;

    uint256 public price;
    INameWrapper nameWrapper;

    constructor(address _nameWrapperAddress, uint256 _price) {
        price = _price;
        nameWrapper = INameWrapper(_nameWrapperAddress);
    }

    function registerParams(
        bytes calldata name,
        uint256 /* duration */
    )
        external
        view
        override
        returns (RegisterParams memory)
    {
        return RegisterParams({
            price: price,
            available: nameWrapper.ownerOf(uint256(name.namehash(0))) == address(0),
            token: 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, // EIP-7528 ETH
            commitTime: 0,
            extraData: ""
        });
    }

    function register(RegisterRequest calldata request)
        external
        payable
        override
    {
        bytes calldata name = request.name;
        bytes32 node = name.namehash(0);
        string memory label = _getLabel(name);

        (, uint256 offset) = name.readLabel(0);
        bytes32 parentNode = name.namehash(offset);

        require(
            nameWrapper.ownerOf(uint256(node)) == address(0),
            "domain already registered"
        );
        require(msg.value >= price, "insufficient funds");

        nameWrapper.setSubnodeRecord(
            parentNode,
            label,
            request.owner,
            request.resolver,
            0,
            request.fuses,
            uint64(request.duration)
        );

        if (request.data.length > 0) {
            Resolver(request.resolver).multicallWithNodeCheck(
                node, request.data
            );
        }
    }

    function _getLabel(bytes calldata name)
        private
        pure
        returns (string memory)
    {
        uint256 labelLength = uint256(uint8(name[0]));
        if (labelLength == 0) return "";
        return string(name[1:labelLength + 1]);
    }

    function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
        return interfaceId == type(IERC165).interfaceId
            || interfaceId == type(OffchainRegister).interfaceId;
    }

}
