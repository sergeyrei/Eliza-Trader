import { IAgentRuntime, Provider, Memory, elizaLogger } from "@elizaos/core";
import { getCryptoNews } from "./utils/marketData";

const cryptoNewsProvider: Provider = {
    get: async (_runtime: IAgentRuntime, _message: Memory) => {
        try {
            const newsArticles = await getCryptoNews();

            const formattedNews = newsArticles.map(article => `Title: ${article.title}\nLink: ${article.link}\nDate: ${article.pubDate}\nSource: ${article.source}`).join("\n\n");

            elizaLogger.log("Fetched crypto news:", { formattedNews });

            return formattedNews || "No crypto news available at the moment.";
        } catch (error) {
            elizaLogger.error("Error in cryptoNewsProvider:", error.message || error);
            return "Unable to fetch cryptocurrency news at the moment. Please check your connection or try again later.";
        }
    },
};

export { cryptoNewsProvider };