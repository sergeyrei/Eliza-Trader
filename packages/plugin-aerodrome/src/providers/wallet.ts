import {
    type IAgentRuntime,
    type Provider,
    type Memory,
    type State,
    elizaLogger,
    type ICacheManager,
} from "@elizaos/core";

import { ethers } from "ethers";

export const aerodromeWalletProvider: Provider = {
    async get(
        runtime: IAgentRuntime,
        _message: Memory,
        state?: State
    ): Promise<string | null> {
        try {
            const privateKey = process.env.EVM_PRIVATE_KEY;
            const providerUrl = process.env.EVM_PROVIDER_URL;

            if (!privateKey || !providerUrl) {
                throw new Error(
                    "Missing EVM_PRIVATE_KEY or EVM_PROVIDER_URL in environment variables."
                );
            }

            elizaLogger.log(
                "Initializing wallet provider with private key and provider URL",
                { privateKey, providerUrl }
            );

            const provider = new ethers.JsonRpcProvider(providerUrl);
            const wallet = new ethers.Wallet(privateKey, provider);

            elizaLogger.log("Wallet provider initialized successfully", {
                wallet,
            });
            const agentName = state?.agentName || "The agent";

            return getWalletDetails(wallet, agentName);
        } catch (error) {
            console.error("Error in EVM wallet provider:", error);
            return null;
        }
    },
};

export const initWalletProvider = async (runtime: IAgentRuntime) => {
    const privateKey = runtime.getSetting("EVM_PRIVATE_KEY") as `0x${string}`;
    if (!privateKey) {
        throw new Error("EVM_PRIVATE_KEY is missing");
    }
    return new ethers.Wallet(
        privateKey,
        new ethers.JsonRpcProvider(process.env.EVM_PROVIDER_URL)
    );
};

async function getWalletDetails(wallet, agentName) {
    const provider = wallet.provider;

    // Fetch the wallet balance
    const balance = await provider.getBalance(wallet.address);
    const formattedBalance = ethers.formatEther(balance); // Convert balance from wei to ETH

    // Fetch chain details
    const network = await provider.getNetwork();

    // Default to "ETH" if no native currency symbol is available
    const currencySymbol = network.nativeCurrency?.symbol || "ETH";
    const walletDetails =
        `${agentName}'s EVM Wallet Address: ${wallet.address}\n` +
        `Balance: ${formattedBalance} ${currencySymbol}\n` +
        `Chain ID: ${network.chainId}, Name: ${network.name}`;
    elizaLogger.log("Details: ", { walletDetails });
    return walletDetails;
}
