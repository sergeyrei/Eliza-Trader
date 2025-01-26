import {
    type IAgentRuntime,
    type Provider,
    type Memory,
    type State,
    elizaLogger,
    type ICacheManager,
} from "@elizaos/core";

import { ethers } from "ethers";

const tokenAddresses = [
    "0x4200000000000000000000000000000000000006", // ETH
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
    "0x940181a94A35A4569E4529A3CDfB74e38FD98631", // AERO
    "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT
    "0x91ad1b44913cd1b8241a4ff1e2eaa198da6bf4c9", // DAI
    "0x0b3e328455c4059eeb9e3f84b5543f74e24e7e1b", // Virtual
    "0x9e1028f5f1d5ede59748ffcee5532509976840e0", // comp
];

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
