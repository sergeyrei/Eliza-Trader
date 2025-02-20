import { IAgentRuntime, Provider, Memory, elizaLogger } from "@elizaos/core";
import { getCryptoNews } from "./utils/marketData";

const cryptoNewsProvider: Provider = {
    get: async (_runtime: IAgentRuntime, _message: Memory) => {
        try {
            const newsArticles = await getCryptoNews();

            const formattedNews = newsArticles
                .slice(0, 7)
                .map(
                    (article) =>
                        `Title: ${article.title}\nLink: ${article.link}\nDate: ${article.pubDate}\nSource: ${article.source}`
                )
                .join("\n\n");

            elizaLogger.log("Fetched crypto news:");

            return (
                "NEWS SECTION - Please use this as your reference for any news-related topics\n" +
                    formattedNews ||
                "NEWS SECTION\nNo crypto news available at the moment."
            );
        } catch (error) {
            elizaLogger.error(
                "Error in cryptoNewsProvider:",
                error.message || error
            );
            return "Unable to fetch cryptocurrency news at the moment. Please check your connection or try again later.";
        }
    },
};

export { cryptoNewsProvider };
