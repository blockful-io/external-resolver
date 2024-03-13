import { ethers as eth } from "hardhat";
import { network } from "hardhat";

import {
  abi as abi_OffchainResolver,
  bytecode as bytecode_OffchainResolver,
} from "../../contracts/out/OffchainResolver.sol/OffchainResolver.json";
import {
  abi as abi_Registry,
  bytecode as bytecode_Registry,
} from "../../contracts/out/ENSRegistry.sol/ENSRegistry.json";
import {
  abi as abi_UniversalResolver,
  bytecode as bytecode_UniversalResolver,
} from "../../contracts/out/UniversalResolver.sol/UniversalResolver.json";
import { BaseContract, Contract, ContractTransactionResponse } from "ethers";
import {
  Client,
  createTestClient,
  http,
  publicActions,
  TestClient,
} from "viem";
import { beforeAll, it, describe } from "vitest";
import { normalize, labelhash, namehash } from "viem/ens";
import { foundry, hardhat, localhost } from "viem/chains";
import { server, abi } from "../../gateway/src/server";
import * as ccipread from "@chainlink/ccip-read-server";
import { exec, execSync } from "node:child_process";

//Gateway url
const _url = "http://127.0.0.1:3001";
// Defining the port where the gateway will run
const port = 3001;
const app = server.makeApp("/");
// Creating an example of Bytes32 variable to represent the Node.
const root =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
//Contracts to be deployed
let offchainResolver: Contract;
let registry: Contract;
let universalResolver: Contract;
let UniversalResolverContract: BaseContract & {
  deploymentTransaction(): ContractTransactionResponse;
} & Omit<BaseContract, keyof BaseContract>;
//Signers
let signers: any[];
let client: Client;

//Function to deploy offchain resolver contract
async function deployOffchainResolver(): Promise<void> {
  const ResolverContract = await new eth.ContractFactory(
    abi_OffchainResolver,
    bytecode_OffchainResolver,
    signers[0]
  ).deploy(_url, signers);

  offchainResolver = await eth.getContractAt(
    abi_OffchainResolver,
    await ResolverContract.getAddress()
  );

  let sla = await offchainResolver.url();
  console.log("Offchain resolver: ", await ResolverContract.getAddress());
}

//Function to deploy registry contract
async function deployRegistry(): Promise<void> {
  const RegistryContract = await new eth.ContractFactory(
    abi_Registry,
    bytecode_Registry,
    signers[0]
  ).deploy();

  registry = await eth.getContractAt(
    abi_Registry,
    await RegistryContract.getAddress()
  );
  console.log("Registry: ", await RegistryContract.getAddress());

  // await registry.setSubnodeOwner(node, labelhash("reverse"), signers[0]);

  await registry.setSubnodeRecord(
    root,
    labelhash("eth"),
    signers[0],
    await offchainResolver.getAddress(),
    10000000
  );
  await registry.setSubnodeRecord(
    namehash("eth"),
    labelhash("offchain"),
    signers[0],
    await offchainResolver.getAddress(),
    10000000
  );
}

//Function to deploy universal resolver contract
async function deployUniversalResolver(): Promise<void> {
  UniversalResolverContract = await new eth.ContractFactory(
    abi_UniversalResolver,
    bytecode_UniversalResolver,
    signers[0]
  ).deploy(await registry.getAddress(), [_url]);

  universalResolver = await eth.getContractAt(
    abi_UniversalResolver,
    await UniversalResolverContract.getAddress()
  );
  console.log("universal resolver: ", await universalResolver.getAddress());
}

//Function to deploy universal resolver contract
async function createClient(): Promise<void> {
  client = createTestClient({
    chain: hardhat,
    mode: "hardhat",
    transport: http(),
  }).extend(publicActions);
}

describe("SeuContrato", () => {
  beforeAll(async () => {
    //exec("yarn hardhat node");

    //Getting signers from hardhat
    signers = await eth.getSigners();

    //Deploying the contracts
    await deployOffchainResolver();
    await deployRegistry();
    //await deployUniversalResolver();

    await createClient();
    app.listen(port, () => {
      console.log(`Gateway is running!`);
    });
  });

  it("Flow test", async () => {
    const UniversalResolverContract = await new eth.ContractFactory(
      abi_UniversalResolver,
      bytecode_UniversalResolver,
      signers[0]
    ).deploy(await registry.getAddress(), [_url]);

    universalResolver = await eth.getContractAt(
      abi_UniversalResolver,
      await UniversalResolverContract.getAddress()
    );
    console.log("universal resolver: ", await universalResolver.getAddress());

    let sla = await offchainResolver.url();
    console.log("Gateway: ", sla);
    let res = await registry.owner(namehash("eth"));
    console.log(res);
    let sss = await registry.resolver(namehash("eth"));
    console.log(sss);

    // console.log(network.provider);
    const Client = createTestClient({
      chain: localhost,
      mode: "anvil",
      transport: http(),
    }).extend(publicActions);
    const ensAddress = normalize("public.eth");

    // try {
    //   const name = "0x067075626c69630365746800";
    //   const data =
    //     "0x59d1d43c855b5494ab793cd61f895c63bd18bbf5918a27dad3de079a483e2232a296512d000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000066176617461720000000000000000000000000000000000000000000000000000";
    //   const resultado = await universalResolver["resolve(bytes,bytes)"](
    //     name,
    //     data
    //   );
    //   console.log(resultado);
    // } catch (error) {
    //   console.error("Erro ao chamar a função resolve:", error);
    // }

    console.log(
      "Queremos chamar: ",
      (await universalResolver.getAddress()) as `0x${string}`
    );
    console.log("Queremos chamar: ", await universalResolver.getAddress());
    console.log(
      ((await universalResolver.getAddress()) as `0x${string}`) ==
        (await universalResolver.getAddress())
    );

    const result = await Client.getEnsAvatar({
      name: ensAddress,
      universalResolverAddress:
        "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9" as `0x${string}`, //(await UniversalResolverContract.getAddress()) as `0x${string}`,
    });

    //console.log(result);
  });
});
