import { EVMGateway } from "evmgateway/evm-gateway/src";

import { JsonRpcProvider } from "ethers";
import {
  L1ProofService,
  type L1ProvableBlock,
} from "evmgateway/l1-gateway/src";

export type L1Gateway = EVMGateway<L1ProvableBlock>;

export function makeL1Gateway(provider: JsonRpcProvider): L1Gateway {
  return new EVMGateway(new L1ProofService(provider));
}

export { L1ProofService, type L1ProvableBlock };
