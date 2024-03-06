import { AddressProps, AddressResponse, SetAddressProps } from "../types";

interface WriteRepository {
  setAddr(SetAddressProps): Promise<AddressResponse>;
}

export async function withSetAddr(
  repo: WriteRepository,
  args: SetAddressProps
): Promise<AddressResponse> {
  return await repo.setAddr(args);
}

interface ReadRepository {
  addr(AddressProps): Promise<AddressResponse>;
}

export async function withAddr(
  repo: ReadRepository,
  args: AddressProps
): Promise<AddressResponse> {
  return await repo.addr(args);
}
