import { IAgentRuntime, Provider, Memory, elizaLogger } from "@elizaos/core";
import { getGeneralNews } from "./utils/marketData";

const newsProvider: Provider = {
    get: async (_runtime: IAgentRuntime, _message: Memory) => {
        try {
            // You can customize the search term or extract it from _message if needed
            const searchTerm = "Politics"; // Default or placeholder
            const newsArticles = await getGeneralNews(searchTerm);

            elizaLogger.log("Fetched general news:");
            const formattedNews = newsArticles
                .slice(0, 7)
                .map(
                    (article) =>
                        `Title: ${article.title}\nLink: ${article.link}\nDate: ${article.pubDate}\nSource: ${article.source}`
                )
                .join("\n\n");

            elizaLogger.log("Fetched general news:", formattedNews);

            return (
                "NEWS SECTION - Please use this as your reference for any news-related topics\n" +
                    formattedNews ||
                "NEWS SECTION\nNo general news available at the moment."
            );
        } catch (error) {
            elizaLogger.error("Error in newsProvider:", error.message || error);
            return "Unable to fetch general news at the moment. Please check your connection or try again later.";
        }
    },
};

export { newsProvider };
