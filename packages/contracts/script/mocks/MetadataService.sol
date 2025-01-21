// SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import "@ens-contracts/wrapper/IMetadataService.sol";

contract MockMetadataService is IMetadataService {

    string private _baseUri;

    constructor(string memory baseUri) {
        _baseUri = baseUri;
    }

    function uri(uint256 /* tokenId */ )
        external
        view
        override
        returns (string memory)
    {
        return _baseUri;
    }

}
