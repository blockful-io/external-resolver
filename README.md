# External Resolver

## Overview

"
The Ethereum Name Service (ENS) has revolutionized the way we interact with the blockchain by replacing complex addresses with human-readable domain names like "myname.eth". However, ENS faces scalability and cost challenges that hinder its widespread adoption. The External Resolver project offers an innovative solution to overcome these obstacles by combining established patterns such as ERC-3668, EIP-5559, ENSIP-10, and ENSIP-16.

At its core, a "resolver" is a crucial component of ENS that translates human-readable domain names into relevant blockchain information, such as wallet addresses, public keys, and custom records. The "resolution" process is fundamental for making domain names usable in decentralized applications (dApps) and wallets.

The External Resolver takes the concept of resolution further by allowing ENS data to be stored and managed off-chain. This drastically reduces transaction costs, improves network scalability, and enables more advanced features like larger and more complex data records.

This project not only makes ENS more efficient and cost-effective but also opens up a world of possibilities for developers and users, expanding the potential of ENS as a foundational infrastructure for Web3. By providing a comprehensive reference implementation for off-chain storage and management, the External Resolver empowers the community to innovate and build upon the ENS ecosystem.
"

## Objectives

- **Enhance Scalability**: Improve ENS scalability for broader adoption.
- **Cost-Effectiveness**: Lower costs for ENS users.
- **Increase Usability**: Make ENS more user-friendly and accessible.
- **Reference implementation**: Create a reference on how to implement off-chain storage and management.

## Components

### L1 Resolver

A smart contract that redirects requests to specified external sources, such as a resolver deployed to an L2.

### L2 Resolver Contract

An L2 contract capable of resolving ENS domains to corresponding addresses and fetching additional information. It can be deployed to any EVM compatible protocol.

### Gateway

An API that handles reading data from external sources, following the flow specified by [EIP-3668](https://eips.ethereum.org/EIPS/eip-3668).

### Client

A client implementation that mimics calls made from a frontend app using [Viem](viem.sh).

## Usage

To run the External Resolver project in its entirety, you'll need to complete the installation process. Since we provide an off-chain resolver solution, it's essential to set up both the database and the Arbitrum Layer 2 environment. This will enable you to run comprehensive end-to-end tests and verify the functionality of the entire project.

### Setup

1. Clone this repository to your local machine.
2. Copy the `env.example` file to `.env` in the root directory.
3. Install dependencies:

    ```bash
    npm install
    ```

### Database Setup

1. Run a local PostgreSQL instance (no initial data is inserted):

    ```shell
    docker-compose up db -d
    ```

2. Deploy the contracts locally:

    ```bash
    npm run contracts start:db
    ```

3. Start the gateway:

    ```bash
    npm run gateway dev:db
    ```

4. Write properties to a given domain:

    ```bash
      npm run client start:write:db
    ```

5. Request domain properties through the client:

    ```bash
    npm run client read
    ```

### Layer 2 Setup

1. Deploy the contracts to the local Arbitrum node (follow the [Arbitrum's local node setup tutorial](https://docs.arbitrum.io/run-arbitrum-node/run-local-dev-node)):

    ```bash
    npm run contracts start:arb:l2
    ```

2. Gather the contract address from the terminal and add it [here](https://github.com/blockful-io/external-resolver/blob/main/packages/contracts/script/local/ArbResolver.s.sol#L56) so the L1 domain gets resolved by the L2 contract you just deployed.

3. Start the gateway:

    ```bash
    npm run gateway dev:arb
    ```

4. Request domain properties through the client:

    ```bash
    npm run client start
    ```

## Deployment

### Prerequisites

Ensure you have the [Railway CLI](https://docs.railway.app/guides/cli) installed.

1. Install the Railway CLI:

    ```bash
    npm i -g @railway/cli
    ```

2. Log in to your Railway account:

    ```bash
    railway login
    ```

3. Link the repo to the project:

    ```bash
    railway link
    ```

4. Deploy the Gateway:

    ```bash
    railway up
    ```

## Architecture

### High-Level Overview

#### Database

![Database Architecture](https://github.com/blockful-io/external-resolver/assets/29408363/02882939-dd54-4fa7-a268-a817403ddd2d)

#### Layer 2

![Layer 2 Architecture](https://github.com/blockful-io/external-resolver/assets/29408363/48306561-59b4-4ab7-b920-b9a8f50cb325)

### Flowchart overview

#### Database

Domain Register and data writing
![domain register and data writing](https://github.com/blockful-io/external-resolver/assets/29408363/3264acdd-1d0b-4ad0-ad60-f6d910480534)

Reading domain properties
![reading domain properties](https://github.com/blockful-io/external-resolver/assets/29408363/4e7f7b6e-dbcb-489c-9468-1a107b735f8d)

#### Layer 2

Domain Register
![domain register](https://github.com/blockful-io/external-resolver/assets/29408363/1ef65db2-a979-4e2f-bb9f-7dde0769fae4)

## Conclusion

This project aims to significantly enhance the scalability and usability of the Ethereum Name Service through the development of a comprehensive reference codebase. By combining existing patterns and best practices, we aim to lower costs for users and drive increased adoption within the industry. We welcome collaboration and feedback from the community as we progress towards our goals.

## Contributing

We welcome contributions from the community to improve this project. To contribute, please follow these guidelines:

1. Fork the repository and create a new branch for your feature or bug fix.
2. Make your changes and ensure they follow the project's coding conventions.
3. Test your changes locally to ensure they work as expected.
4. Create a pull request with a detailed description of your changes.

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgements

Special thanks to the Ethereum Name Service (ENS) community for their contributions and support.
