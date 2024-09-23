src_dir := packages/contracts/src
script_dir := packages/contracts/script
deploy_dir := $(script_dir)/deploy

PRIVATE_KEY?=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
L2_PRIVATE_KEY?=0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659
ETHERSCAN_API_KEY := VEJ7GISNRKFUESRPC4W4D3ZEM2P9B4J6C4

.PHONY: deploy-arb

include .env

deploy-arb: 
	@set -e; \
	echo "Deploying L2ArbitrumResolver..." && \
	forge script $(deploy_dir)/L2ArbitrumResolver.sol \
		--rpc-url arb_sepolia \
		--broadcast \
		-vvv \
		--private-key $(L2_PRIVATE_KEY);

full-deploy-arb: 
	CONTRACTS := ENSRegistry ReverseRegistrar BaseRegistrarImplementation NameWrapper ETHRegistrarController NameWrapperProxy L2ArbitrumResolver
	@set -e; \
	$(foreach contract,$(CONTRACTS),\
		echo "Deploying $(contract)..." && \
		forge script $(deploy_dir)/$(contract).sol \
			--rpc-url arb_sepolia \
			--broadcast \
			-vvv \
			--private-key $(L2_PRIVATE_KEY) \
			&& \
	) true; \
	echo "All contracts deployed successfully."
