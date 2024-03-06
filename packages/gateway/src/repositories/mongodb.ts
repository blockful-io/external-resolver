import {
  SetAddressProps,
  NodeProps,
  SetTextProps,
  GetTextProps,
  AddressResponse,
  TextResponse,
  BalanceResponse,
} from "../types";

export class MongoDBRepository {
  async setAddr({
    node,
    addr,
    coin,
  }: SetAddressProps): Promise<AddressResponse> {
    return;
  }

  async addr({ node }: NodeProps): Promise<AddressResponse> {
    return;
  }

  async getSignedBalance({ node }: NodeProps): Promise<BalanceResponse> {
    return;
  }

  async setText({ node, key, value }: SetTextProps): Promise<TextResponse> {
    return;
  }

  async getText({ node, key }: GetTextProps): Promise<TextResponse> {
    return;
  }
}
