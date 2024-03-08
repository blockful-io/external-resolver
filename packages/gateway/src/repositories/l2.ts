import {
  SetAddressProps,
  SetTextProps,
  GetTextProps,
  Response,
  GetAddressProps,
} from "../types";

export class L2Repository {
  constructor() {}

  async setAddr({
    node,
    addr,
    coin,
  }: SetAddressProps): Promise<Response | undefined> {
    return;
  }

  async addr({ node, coin }: GetAddressProps): Promise<Response | undefined> {
    return;
  }

  async setText({
    node,
    key,
    value,
  }: SetTextProps): Promise<Response | undefined> {
    return;
  }

  async getText({ node, key }: GetTextProps): Promise<Response | undefined> {
    return;
  }
}
