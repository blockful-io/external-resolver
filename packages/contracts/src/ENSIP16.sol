// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "forge-std/console.sol";

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

interface IENSIP16 {

    function metadata() external view returns (string memory);

}

abstract contract ENSIP16 is IERC165, IENSIP16 {

    //////// STATE VARIABLES ////////

    string public metadataUrl;

    //////// EVENTS ////////

    event MetadataUrlSet(string indexed previousUrl, string indexed newUrl);

    //////// INITIALIZER ////////

    constructor(string memory newMetadataUrl) {
        metadataUrl = newMetadataUrl;
    }

    //////// PUBLIC READ FUNCTIONS ////////

    /**
     * @dev Returns the metadata of the resolver on L2
     * @return metadataUrl url of metadata endpoint that provides additional information about the offchain name and its subdomains
     */
    function metadata() external view virtual returns (string memory) {
        return (metadataUrl);
    }

    /**
     * @notice Support ERC-165 introspection.
     * @param interfaceID Interface ID.
     * @return True if a given interface ID is supported.
     */
    function supportsInterface(bytes4 interfaceID)
        public
        view
        virtual
        override(IERC165)
        returns (bool)
    {
        return interfaceID == type(IENSIP16).interfaceId;
    }

    //////// PUBLIC WRITE FUNCTIONS ////////

    /**
     * @notice Sets the new metadata URL and emits a MetadataUrlSet event.
     * @param newUrl New URL to be set.
     */
    function setMetadataUrl(string memory newUrl) external virtual {
        _setMetadataUrl(newUrl);
    }

    //////// PRIVATE FUNCTIONS ////////

    /**
     * @notice Sets the new metadata URL and emits a MetadataUrlSet event.
     * @param newUrl New URL to be set.
     */
    function _setMetadataUrl(string memory newUrl) internal {
        string memory previousUrl = metadataUrl;
        metadataUrl = newUrl;

        emit MetadataUrlSet(previousUrl, newUrl);
    }

}
