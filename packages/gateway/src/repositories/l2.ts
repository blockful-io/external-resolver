import {
  SetAddressProps,
  SetTextProps,
  GetTextProps,
  Response,
  GetAddressProps,
  DomainProps,
  SetContentHashProps,
} from "../types";

export class L2Repository {
  constructor() { }

  async setContentHash({
    node,
    contenthash
  }: SetContentHashProps): Promise<Response | undefined> {
    return
  }

  async contentHash({ node }: GetAddressProps): Promise<Response | undefined> {
    return
  }

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
