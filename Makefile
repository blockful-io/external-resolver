src_dir := packages/contracts/src
script_dir := packages/contracts/script
deploy_dir := $(script_dir)/deploy

PRIVATE_KEY?=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
ETHERSCAN_API_KEY?=VEJ7GISNRKFUESRPC4W4D3ZEM2P9B4J6C4

.PHONY: deploy-arb

include .env

deploy-arb-l1:
	@set -e; \
	echo "Deploying ArbitrumVerifier..." && \
	forge script $(deploy_dir)/ArbitrumVerifier.sol \
		--rpc-url sepolia \
		--broadcast \
		-vvv \
		--private-key $(PRIVATE_KEY) \
		--verify && \
	echo "Deploying L1ArbitrumResolver..." && \
	forge script $(deploy_dir)/L1ArbitrumResolver.sol \
		--rpc-url sepolia \
		--broadcast \
		-vvv \
		--private-key $(PRIVATE_KEY) \
		--verify;

deploy-arb-resolver:
	@set -e; \
	echo "Deploying L2ArbitrumResolver..." && \
	forge script $(deploy_dir)/L2ArbitrumResolver.sol \
		--rpc-url arb_sepolia \
		--broadcast \
		-vvv \
		--private-key $(PRIVATE_KEY) \
		--verify;

	
CONTRACTS := ENSRegistry ReverseRegistrar BaseRegistrarImplementation NameWrapper ETHRegistrarController SubdomainController L2ArbitrumResolver
deploy-arb-full:
	@set -e; \
	$(foreach contract,$(CONTRACTS),\
		echo "Deploying $(contract)..." && \
		forge script $(deploy_dir)/$(contract).sol \
			--rpc-url arb_sepolia \
			--broadcast \
			-vvv \
			--private-key $(PRIVATE_KEY) \
			--verify \
			&& \
	) true; \
	echo "All contracts deployed successfully."
