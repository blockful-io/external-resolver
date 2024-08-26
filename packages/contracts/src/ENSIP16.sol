// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "forge-std/console.sol";

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

interface IENSIP16 {

    function metadata() external view returns (string memory);

}

abstract contract ENSIP16 is IERC165, IENSIP16 {

    //////// STATE VARIABLES ////////

    string public graphqlUrl;

    //////// EVENTS ////////

    event GraphqlUrlSet(string indexed previousUrl, string indexed newUrl);

    //////// INITIALIZER ////////

    constructor(string memory newGraphqlUrl) {
        graphqlUrl = newGraphqlUrl;
    }

    //////// PUBLIC READ FUNCTIONS ////////

    /**
     * @dev Returns the metadata of the resolver on L2
     * @return graphqlUrl url of graphql endpoint that provides additional information about the offchain name and its subdomains
     */
    function metadata() external view virtual returns (string memory) {
        return (graphqlUrl);
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
     * @notice Sets the new graphQL URL and emits a GraphqlUrlSet event.
     * @param newUrl New URL to be set.
     */
    function setGraphqlUrl(string memory newUrl) external virtual {
        _setGraphqlUrl(newUrl);
    }

    //////// PRIVATE FUNCTIONS ////////

    /**
     * @notice Sets the new graphQL URL and emits a GraphqlUrlSet event.
     * @param newUrl New URL to be set.
     */
    function _setGraphqlUrl(string memory newUrl) private {
        string memory previousUrl = graphqlUrl;
        graphqlUrl = newUrl;

        emit GraphqlUrlSet(previousUrl, newUrl);
    }

}
