import ethers from "ethers";
import * as ccip from "@chainlink/ccip-read-server";

import { TextResponse, SetTextProps, GetTextProps } from "../types";

interface WriteRepository {
  setText(params: SetTextProps): Promise<TextResponse>;
}

export function withSetText(repo: WriteRepository): ccip.HandlerDescription {
  return {
    type: "setText",
    func: async (args: ethers.utils.Result) => {
      const params: SetTextProps = {
        node: args["node"]!,
        key: args["key"]!,
        value: args["value"]!,
      };

      const { value, ttl } = await repo.setText(params);
      return [value, ttl];
    },
  };
}

interface ReadRepository {
  getText(params: GetTextProps): Promise<TextResponse>;
}

export function withGetText(repo: ReadRepository): ccip.HandlerDescription {
  return {
    type: "text",
    func: async (args: ethers.utils.Result) => {
      const params: GetTextProps = {
        node: args["node"]!,
        key: args["key"]!,
      };
      const { value, ttl } = await repo.getText(params);
      return [value, ttl];
    },
  };
}
