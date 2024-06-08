// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

abstract contract ENSHelper {

    bytes32 constant rootNode =
        0x0000000000000000000000000000000000000000000000000000000000000000;

    function labelhash(string memory _name) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_name));
    }

    // Implementation from https://github.com/JonahGroendal/ens-namehash
    function namehash(bytes memory domain) internal pure returns (bytes32) {
        return namehash(domain, 0);
    }

    function namehash(
        bytes memory domain,
        uint256 i
    )
        internal
        pure
        returns (bytes32)
    {
        if (domain.length <= i) {
            return
            0x0000000000000000000000000000000000000000000000000000000000000000;
        }

        uint256 len = LabelLength(domain, i);

        return keccak256(
            abi.encodePacked(
                namehash(domain, i + len + 1), keccak(domain, i, len)
            )
        );
    }

    function LabelLength(
        bytes memory domain,
        uint256 i
    )
        private
        pure
        returns (uint256)
    {
        uint256 len;
        while (i + len != domain.length && domain[i + len] != 0x2e) len++;
        return len;
    }

    function keccak(
        bytes memory data,
        uint256 offset,
        uint256 len
    )
        private
        pure
        returns (bytes32 ret)
    {
        require(offset + len <= data.length);
        assembly {
            ret := keccak256(add(add(data, 32), offset), len)
        }
    }

}
