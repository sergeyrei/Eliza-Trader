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
                .slice(0, 2)
                .map(
                    (article) =>
                        `Title: ${article.title}\nDate: ${article.pubDate}\nSource: ${article.source}`
                )
                .join("\n\n");

            elizaLogger.log("Fetched general news:", formattedNews);

            return (
                "NEWS SECTION - just use it if you think news is important for generate post \n" + formattedNews ||
                "NEWS SECTION\nNo general news available at the moment."
            );
        } catch (error) {
            elizaLogger.error("Error in newsProvider:", error.message || error);
            return "Unable to fetch general news at the moment. Please check your connection or try again later.";
        }
    },
};

export { newsProvider };
