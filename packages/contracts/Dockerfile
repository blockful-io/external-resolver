# Use the latest foundry image
FROM ghcr.io/foundry-rs/foundry

# Copy our source code into the container
WORKDIR /app
COPY . .

RUN forge build

# Runs `forge script` against the anvil chain to set up contracts
ENV INIT_SCRIPTS='forge script ./script/*.s.sol --chain-id 1337 --rpc-url http://0.0.0.0:8545 --private-key ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80  --broadcast'

# Command to start the anvil service
ENV ANVIL_START='anvil --chain-id 1337 --host 0.0.0.0 --silent'

# Execute the scripts after the anvil service is started
ENTRYPOINT (sleep 2 && $INIT_SCRIPTS) & $ANVIL_START
