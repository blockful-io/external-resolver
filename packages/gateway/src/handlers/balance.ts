import { BalanceResponse, NodeProps } from "../types";

interface ReadRepository {
  getSignedBalance(GetSignedBalanceProps): Promise<BalanceResponse>;
}

export async function withSignedBalance(
  repo: ReadRepository,
  args: NodeProps
): Promise<BalanceResponse> {
  return await repo.getSignedBalance(args);
}
