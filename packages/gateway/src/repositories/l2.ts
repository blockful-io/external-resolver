/* eslint-disable */
import {
  SetAddressProps,
  SetTextProps,
  GetTextProps,
  Response,
  GetAddressProps,
  SetContentHashProps,
} from '../types'

export class L2Repository {
  async setContentHash({
    node,
    contenthash,
  }: SetContentHashProps): Promise<void> {
    return
  }

  async contentHash({ node }: GetAddressProps): Promise<Response | undefined> {
    return
  }

  async setAddr({
    node,
    addr,
    coin,
  }: SetAddressProps): Promise<void> {
    return
  }

  async addr({ node, coin }: GetAddressProps): Promise<Response | undefined> {
    return
  }

  async setText({
    node,
    key,
    value,
  }: SetTextProps): Promise<void> {
    return
  }

  async getText({ node, key }: GetTextProps): Promise<Response | undefined> {
    return
  }
}
