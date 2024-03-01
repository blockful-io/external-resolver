import { Command } from "commander";
import { createPublicClient, http } from "viem";
import { normalize } from "viem/ens";
import { localhost } from "viem/chains";

const program = new Command();
program
  .requiredOption("-r --resolver <address>", "ENS Universal Resolver address")
  .option("-p --provider <url>", "web3 provider URL", "http://127.0.0.1:8545/")
  .option("-i --chainId <chainId>", "chainId", "1337");

program.parse(process.argv);

const { resolver, provider } = program.opts();

const client = createPublicClient({
  chain: localhost,
  transport: http(provider),
});

(async () => {
  const ensAddress = normalize("public.eth");

  const avatar = await client.getEnsAvatar({
    name: ensAddress,
    universalResolverAddress: resolver,
  });
  const address = await client.getEnsAddress({
    name: ensAddress,
    universalResolverAddress: resolver,
  });
  const name = await client.getEnsName({
    address: "0xc74E8eFaFE54481bD109f97422AeBca607499f57",
    universalResolverAddress: resolver,
  });
})();
