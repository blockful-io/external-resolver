## Call contracts deployed on Arbitrum testnet


1 - Create a .env file based on exemple.env

````bash
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
PRIVATE_KEY_ARBITRUM=
RPC_URL=
DATABASE_URL=postgresql://blockful:ensdomains@localhost:5432/ensdomains
LAYER_ONE_RPC=https://sepolia.drpc.org
LAYER2_RPC=https://sepolia-rollup.arbitrum.io/rpc
CHAIN_ID=421614
L2_RESOLVER_ADDR='0xa1904f827dD546e625eB40108908aD78719Ca535'
L1_UNIVERSAL_RESOLVER='0x84F145F46c335970093a14174a0E2F63bf8822e8'
````

2 - Build dependencies

````bash
yarn 
````

3 - Run the gateway 

````bash
yarn gateway start:l2
````

4 - Execute "debug l2 client" on the vscode debuger to call the client.
![debug l2 client](https://github.com/blockful-io/external-resolver/assets/69486932/6695c0df-a6bd-421c-966e-b0accbc4a052)
