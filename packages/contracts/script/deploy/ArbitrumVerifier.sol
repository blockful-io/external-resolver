// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";

import {IRollupCore} from "@nitro-contracts/src/rollup/IRollupCore.sol";

import {ArbitrumVerifier} from "../../src/ArbitrumVerifier.sol";
import {L1ArbitrumConfig} from "../config/L1ArbitrumConfig.s.sol";

contract ArbitrumVerifierScript is Script {

    function run() external {
        (
            , /* ENSRegistry registry */
            IRollupCore rollup,
            , /* uint256 targetChainId */
            , /* address l2Resolver */ /* address l2Registrar */
        ) = (new L1ArbitrumConfig(block.chainid, msg.sender))
            .activeNetworkConfig();

        string[] memory urls = new string[](1);
        urls[0] = vm.envString("GATEWAY_URL");

        vm.broadcast();
        new ArbitrumVerifier(urls, rollup);
    }

}
