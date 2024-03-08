import ethers from "ethers";
import * as ccip from "@chainlink/ccip-read-server";

import { Response, SetTextProps, GetTextProps } from "../types";

interface WriteRepository {
  setText(params: SetTextProps): Promise<Response | undefined>;
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

      const text = await repo.setText(params);
      if (!text) return [];
      return [text.value, text.ttl];
    },
  };
}

interface ReadRepository {
  getText(params: GetTextProps): Promise<Response | undefined>;
}

export function withGetText(repo: ReadRepository): ccip.HandlerDescription {
  return {
    type: "text",
    func: async (args: ethers.utils.Result) => {
      const params: GetTextProps = {
        node: args["node"]!,
        key: args["key"]!,
      };
      const text = await repo.getText(params);
      if (!text) return [];
      return [text.value, text.ttl];
    },
  };
}
