import ethers from "ethers";
import * as ccip from "@chainlink/ccip-read-server";

import { BalanceResponse, NodeProps } from "../types";

interface ReadRepository {
  getSignedBalance(params: NodeProps): Promise<BalanceResponse>;
}

export function withGetSignedBalance(
  repo: ReadRepository
): ccip.HandlerDescription {
  return {
    type: "",
    func: async (args: ethers.utils.Result) => {
      const params: NodeProps = {
        node: args["node"],
      };
      const { balance, ttl } = await repo.getSignedBalance(params);
      return [balance, ttl];
    },
  };
}
