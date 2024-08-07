// Application Binary Interfaces
export const abi: string[] = [
  'function query((address sender, string[] urls,bytes callData)[] memory data) external returns (bool[] memory failures, bytes[] memory responses)',
  'function setText(bytes32 node, string calldata key, string calldata value)',
  'function text(bytes32 node, string key) view returns (string)',
  'function setAddr(bytes32 node, address addr)',
  'function addr(bytes32 node) view returns (address)',
  'function setAddr(bytes32 node, uint coinType, bytes calldata addr)',
  'function addr(bytes32 node, uint coinType) view returns (bytes)',
  'function ABI(bytes32 node, uint256 contentType) returns (uint256, bytes)',
  'function setABI(bytes32 node, uint256 contentType, bytes calldata data)',
  'function contenthash(bytes32 node) view returns (bytes memory)',
  'function setContenthash(bytes32 node, bytes calldata contenthash)',
  'function setPubkey(bytes32 node,bytes32 x, bytes32 y)',
  'function pubkey(bytes32 node) external view returns (bytes32 x, bytes32 y)',
  'function getStorageSlots(address addr, bytes32[] memory commands, bytes[] memory) external view returns(bytes memory witness)',
  'function register(bytes memory name, uint32 ttl, address owner)',
  'function transfer(bytes32 node, address owner)',
  'function multicall(bytes[] calldata data) external returns (bytes[] memory results)',
]
