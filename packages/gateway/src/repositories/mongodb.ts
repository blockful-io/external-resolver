import { Address, PrismaClient } from "@prisma/client";

import {
  SetAddressProps,
  NodeProps,
  SetTextProps,
  GetTextProps,
  Response,
  GetAddressProps,
} from "../types";

export class MongoDBRepository {
  private client: PrismaClient;

  constructor(client: PrismaClient) {
    this.client = client;
  }

  async setAddr({ node, addr, coin }: SetAddressProps): Promise<Response> {
    return {};
  }

  async addr({ node, coin }: GetAddressProps): Promise<Response> {
    const dbAddress: Pick<Address, "address"> | null =
      await this.client.address.findUnique({
        where: {
          domainHash: node,
          coin,
        },
        select: { address: true },
      });

    if (!dbAddress) return {};

    const { address } = dbAddress;

    return { value: address, ttl: 40 };
  }

  async getSignedBalance({ node }: NodeProps): Promise<Response> {
    return {};
  }

  async setText({ node, key, value }: SetTextProps): Promise<Response> {
    return {};
  }

  async getText({ node, key }: GetTextProps): Promise<Response> {
    return {};
  }
}
