import { PrismaClient } from "@prisma/client";

import {
  SetAddressProps,
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

  async setAddr({
    node: domainHash,
    addr: address,
    coin,
  }: SetAddressProps): Promise<Response | undefined> {
    const newAddr = await this.client.address.create({
      data: {
        domainHash,
        address,
        coin,
      },
    });
    return { value: newAddr.address, ttl: 40 };
  }

  async addr({ node, coin }: GetAddressProps): Promise<Response | undefined> {
    const dbAddress = await this.client.address.findUnique({
      where: {
        domainHash: node,
        coin,
      },
      select: { address: true },
    });

    if (!dbAddress) return;

    const { address } = dbAddress;

    return { value: address, ttl: 40 };
  }

  async setText({
    node: domainHash,
    key,
    value,
  }: SetTextProps): Promise<Response | undefined> {
    const newText = await this.client.text.create({
      data: {
        domainHash,
        key,
        value,
      },
    });
    return { value: newText.value, ttl: 40 };
  }

  async getText({
    node: domainHash,
    key,
  }: GetTextProps): Promise<Response | undefined> {
    const text = await this.client.text.findUnique({
      where: {
        domainHash,
        key,
      },
    });
    if (!text) return;

    return { value: text.value, ttl: 40 };
  }
}
