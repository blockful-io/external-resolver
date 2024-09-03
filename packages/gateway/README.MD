# CCIP-Read Gateway

The gateway is built using CCIP-Read to handle function calls indicated by the ENS Interface Standards it enables the creation of the gateway and interaction according to the EIP-3668.

It supports different datasources such as relational databases, Layer 2 solutions (e.g. Arbitrum and Optimism). It also exposes a GraphQL API fully compliant with the ENSIP-16 used to retrieve data of an externally stored ENS name.

## Usage

This folder contains a simple gateway and a series of tests for it.

1. Install dependencies: `npm install`
2. Build the source files: `npm run build`
3. Execute the tests: `npm test`

### Database

- Be sure a database is running and that the environment variables are set on the root `.env`
- Run the gateway for a database: `npm run start:db`

### Metadata

- Be sure a database is running and that the environment variables are set on the root `.env`
- Run the gateway for exposing the Metadata API: `npm run start:metadata`

### Migrations

The migrations are handled by TypeORM. Their lifecycle is the following:

1. Change the entities under `src/entities`
2. Generate a new migration by running `npm run migration:generate --name=<name>`
3. Let then run automatically by starting the gateway or manually apply them by running `npm run migration:run`
4. If needed, revert the migration by running `npm run migration:revert`

\* To create an empty migration, run `npm run migration:create --name=<name>`
\** To run from the root folder all commands should start with `npm run gateway` (e.g. `npm run gateway migration:up`)
