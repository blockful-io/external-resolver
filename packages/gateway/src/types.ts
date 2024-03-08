export type Response = { value: string; ttl: number };

export type SetAddressProps = {
  node: string;
  addr: string;
  coin?: number;
};

export type GetAddressProps = {
  node: string;
  coin?: number;
};

export type SetTextProps = {
  node: string;
  key: string;
  value: string;
};

export type GetTextProps = {
  node: string;
  key: string;
};
