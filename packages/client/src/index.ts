import { Command } from "commander";
import { createPublicClient, http } from "viem";
import { normalize } from "viem/ens";
import { localhost } from "viem/chains";

const program = new Command();
program
  .requiredOption("-r --registry <address>", "ENS registry address")
  .option("-p --provider <url>", "web3 provider URL", "http://127.0.0.1:8545/")
  .option("-i --chainId <chainId>", "chainId", "1337");

program.parse(process.argv);

const { registry, provider } = program.opts();

const client = createPublicClient({
  chain: localhost,
  transport: http(provider),
});

(async () => {
  const ensAddress = normalize("public.eth");

  const x = await client.getEnsAddress({
    name: ensAddress,
    universalResolverAddress: registry,
    // gatewayUrls: ["http://localhost:8080/nodes/{sender}/{data}.json"],
  });
  console.log("address", x);
})();
