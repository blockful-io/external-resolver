import { localhost } from "viem/chains";
import { createPublicClient, http } from "viem";
import { normalize } from "viem/ens";

const client = createPublicClient({
  chain: localhost,
  transport: http("http://127.0.0.1:8545/"),
});

test("should resolve", async () => {
  const ensAddress = normalize("public.eth");

  const x = await client.getEnsAvatar({
    name: ensAddress,
    universalResolverAddress: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  });

  expect(x).toEqual("blockful.png");
});
