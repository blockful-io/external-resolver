// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import "@ens-contracts/registry/ENSRegistry.sol";
import "@ens-contracts/reverseRegistrar/ReverseRegistrar.sol";
import "@ens-contracts/utils/UniversalResolver.sol";

import "../Helper.sol";
import {DatabaseResolver} from "../../src/DatabaseResolver.sol";

contract DatabaseResolverScript is Script, ENSHelper {
    function run() external {
        string memory gatewayURL = vm.envString("GATEWAY_URL");
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address publicKey = vm.addr(privateKey);
        vm.startBroadcast(privateKey);

        ENSRegistry registry = new ENSRegistry();
        string[] memory urls = new string[](1);
        urls[0] = gatewayURL;
        new UniversalResolver(address(registry), urls);
        ReverseRegistrar registrar = new ReverseRegistrar(registry);

        // .reverse
        registry.setSubnodeOwner(rootNode, labelhash("reverse"), publicKey);
        // addr.reverse
        registry.setSubnodeOwner(namehash("reverse"), labelhash("addr"), address(registrar));

        address[] memory signers = new address[](1);
        signers[0] = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
        DatabaseResolver resolver = new DatabaseResolver(gatewayURL, 600, signers);

        // .eth
        registry.setSubnodeRecord(rootNode, labelhash("eth"), publicKey, address(resolver), 100000);
        // blockful.eth
        registry.setSubnodeRecord(namehash("eth"), labelhash("blockful"), publicKey, address(resolver), 100000);

        vm.stopBroadcast();
    }
}
