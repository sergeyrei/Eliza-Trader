import { IAgentRuntime, Provider, Memory, elizaLogger } from "@elizaos/core";
import { getMarketData, formatMarketData, formatSection } from "./utils/marketData";
import fetch from "node-fetch";

const cryptoPriceProvider: Provider = {
    get: async (_runtime: IAgentRuntime, _message: Memory) => {
        try {
            let marketData;
            try {
                marketData = await getMarketData();
                if (!marketData) {
                    throw new Error("Market data is undefined.");
                }
            } catch (error) {
                elizaLogger.error("Error fetching market data:", error.message || error);
                throw new Error("Failed to retrieve market data. Please try again later. Ensure your network connection is active and try refreshing the application.");
            }

            const formattedData = formatMarketData(marketData);
            const { layer1s, defi, memecoins, altcoins } = formattedData;

            let fearGreedResponse;
            try {
                fearGreedResponse = await fetch("https://api.alternative.me/fng/");
                if (!fearGreedResponse.ok) {
                    throw new Error("Failed to fetch Fear and Greed Index.");
                }
            } catch (error) {
                elizaLogger.error("Error fetching Fear and Greed Index:", error.message || error);
                throw new Error("Unable to fetch Fear and Greed Index data at the moment. Please check your connection or try again later.");
            }

            const fearGreedData = await fearGreedResponse.json();
            const marketSentiment = fearGreedData.data?.[0]?.value_classification || "Unknown";

            const result = `
                ${formatSection("Layer 1s", layer1s)}

                ${formatSection("DeFi", defi)}

                ${formatSection("Memecoins", memecoins)}

                ${formatSection("Altcoins", altcoins)}

                Market Sentiment: ${marketSentiment}
            `;

            const timestamp = new Date().toISOString();
            const requestId = crypto.randomUUID(); // Assume a UUID generator is available
            elizaLogger.log(`[${timestamp}] [Request ID: ${requestId}] ${result.trim()}`);
            return result.trim();
        } catch (error) {
            elizaLogger.error("Error in cryptoPriceProvider:", error.message || error);
            return "Unable to fetch cryptocurrency data at the moment. Please check your connection or contact support if the issue persists.";
        }
    },
};

export { cryptoPriceProvider };