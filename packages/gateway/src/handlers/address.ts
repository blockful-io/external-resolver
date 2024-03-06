import ethers from "ethers";
import * as ccip from "@chainlink/ccip-read-server";

import { GetAddressProps, AddressResponse, SetAddressProps } from "../types";

interface WriteRepository {
  setAddr(params: SetAddressProps): Promise<AddressResponse>;
}

export function withSetAddr(repo: WriteRepository): ccip.HandlerDescription {
  return {
    type: "setAddr",
    func: async (args: ethers.utils.Result) => {
      const params: SetAddressProps = {
        node: args["node"],
        coin: args["coin"],
        addr: args["address"],
      };
      const { addr, ttl } = await repo.setAddr(params);
      return [addr, ttl];
    },
  };
}

interface ReadRepository {
  addr(params: GetAddressProps): Promise<AddressResponse>;
}

export function withAddr(repo: ReadRepository): ccip.HandlerDescription {
  return {
    type: "addr",
    func: async (args: ethers.utils.Result) => {
      const params: GetAddressProps = {
        node: args["node"],
        coin: args["coin"],
      };
      const { addr, ttl } = await repo.addr(params);
      return [addr, ttl];
    },
  };
}
