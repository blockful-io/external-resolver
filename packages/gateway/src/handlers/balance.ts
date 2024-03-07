import ethers from "ethers";
import * as ccip from "@chainlink/ccip-read-server";

import { Response, NodeProps } from "../types";

interface ReadRepository {
  getSignedBalance(params: NodeProps): Promise<Response>;
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
      const { value, ttl } = await repo.getSignedBalance(params);
      return [value, ttl];
    },
  };
}
