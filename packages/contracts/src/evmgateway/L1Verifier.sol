// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {IEVMVerifier} from "./IEVMVerifier.sol";
import {RLPReader} from "@eth-optimism/contracts-bedrock/src/libraries/rlp/RLPReader.sol";
import {StateProof, EVMProofHelper} from "./EVMProofHelper.sol";

struct L1WitnessData {
    uint256 blockNo;
    bytes blockHeader;
}

contract L1Verifier is IEVMVerifier {
    error BlockHeaderHashMismatch(uint256 current, uint256 number, bytes32 expected, bytes32 actual);

    string[] _gatewayURLs;

    constructor(string[] memory urls) {
        _gatewayURLs = urls;
    }

    function gatewayURLs() external view returns (string[] memory) {
        return _gatewayURLs;
    }

    function getStorageValues(address target, bytes32[] memory commands, bytes[] memory constants, bytes memory proof)
        external
        pure
        returns (bytes[] memory values)
    {
        (L1WitnessData memory l1Data, StateProof memory stateProof) = abi.decode(proof, (L1WitnessData, StateProof));
        RLPReader.RLPItem[] memory headerFields = RLPReader.readList(l1Data.blockHeader);
        bytes32 stateRoot = bytes32(RLPReader.readBytes(headerFields[3]));
        return EVMProofHelper.getStorageValues(target, commands, constants, stateRoot, stateProof);
    }
}