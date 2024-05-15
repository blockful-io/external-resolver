// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IExtendedResolver.sol";
import "./IExtendedDBWriteResolver.sol";
import "./SignatureVerifier.sol";

/**
 * Implements an ENS resolver that directs all queries to a CCIP read gateway.
 * Callers must implement EIP 3668 and ENSIP 10.
 */
contract DatabaseResolver is IExtendedResolver, IExtendedDBWriteResolver, IERC165, Ownable {
    string public url;
    mapping(address => bool) public signers;

    event NewSigners(address indexed signer, bool isSigner);
    event UpdateUrl(string url);

    constructor(string memory _url, address[] memory _signers) {
        url = _url;
        emit UpdateUrl(_url);

        uint256 arrayLength = _signers.length;
        for (uint256 i; i < arrayLength;) {
            signers[_signers[i]] = true;
            emit NewSigners(_signers[i], true);

            unchecked {
                ++i;
            }
        }
    }

    function makeSignatureHash(address target, uint64 expires, bytes memory request, bytes memory result)
        external
        pure
        returns (bytes32)
    {
        return SignatureVerifier.makeSignatureHash(target, expires, request, result);
    }

    /**
     * @param data The ABI encoded data for the underlying writing function
     * (Eg, setAddr(bytes32, address), setText(bytes32,string, string), etc).
     * @return The return data, ABI encoded identically to the underlying function.
     */
    function write(bytes calldata data) external view override returns (bytes memory) {
        revert StorageHandledByOffChainDatabase(address(this), url, data);
    }

    /**
     * Resolves a name, as specified by ENSIP 10 (wildcard).
     * @param name The DNS-encoded name to resolve.
     * @param data The ABI encoded data for the underlying resolution function
     * (Eg, addr(bytes32), text(bytes32,string), etc).
     * @return The return data, ABI encoded identically to the underlying function.
     */
    function resolve(bytes calldata name, bytes calldata data) external view override returns (bytes memory) {
        string[] memory urls = new string[](1);
        urls[0] = url;

        // revert with the OffchainLookup error, which will be caught by the client
        revert OffchainLookup(
            address(this), urls, data, DatabaseResolver.resolveWithProof.selector, abi.encode(data, address(this))
        );
    }

    function updateSigners(address[] calldata _signers, bool[] calldata _isSigner) external onlyOwner {
        for (uint256 i = 0; i < _signers.length; i++) {
            signers[_signers[i]] = _isSigner[i];
            emit NewSigners(_signers[i], _isSigner[i]);
        }
    }

    function updateUrl(string calldata _url) external onlyOwner {
        url = _url;
        emit UpdateUrl(_url);
    }

    /**
     * Callback used by CCIP read compatible clients to verify and parse the response.
     */
    function resolveWithProof(bytes calldata response, bytes calldata extraData) external view returns (bytes memory) {
        (address signer, bytes memory result) = SignatureVerifier.verify(extraData, response);

        require(signers[signer], "SignatureVerifier: Invalid sigature");

        return result;
    }

    function supportsInterface(bytes4 interfaceID) public pure returns (bool) {
        return interfaceID == type(IExtendedResolver).interfaceId || interfaceID == type(IERC165).interfaceId;
    }
}
