import { localhost } from "viem/chains";
import { createPublicClient, http } from "viem";
import { normalize, labelhash, namehash } from "viem/ens";

const client = createPublicClient({
  chain: localhost,
  transport: http(),
});

describe("ENS reading", () => {
  const owner = "0x0000000000000000000000000000000000000001";
  const ensAddress = normalize("public.eth");

  test("should get avatar", async () => {
    const avatar = await client.getEnsAvatar({
      name: ensAddress,
      universalResolverAddress: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    });

    expect(avatar).toContain("QmdzG4h3KZjcyLsDaVxuFGAjYi7MYN4xxGpU9hwSj1c3CQ"); // blockful.jpeg
  });

  test("should get address", async () => {
    const address = await client.getEnsAddress({
      name: ensAddress,
      universalResolverAddress: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    });

    expect(address).toBe(owner);
  });

  test("should get resolver", async () => {
    const resolver = await client.getEnsResolver({
      name: ensAddress,
      universalResolverAddress: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    });

    expect(resolver).toBe("0x5FC8d32690cc91D4c39d9d3abcBD16989F875707");
  });

  test("should get name", async () => {
    const name = await client.getEnsName({
      address:
        "0x36f4458307cdb864c670ce989072842621dd6b7022b8abacc37f7fab25890b27",
      universalResolverAddress: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    });

    expect(name).toBe("blockful");
  });
});
