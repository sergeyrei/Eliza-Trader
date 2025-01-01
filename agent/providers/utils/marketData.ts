import { elizaLogger } from "@elizaos/core";
import fetch from "node-fetch";
import Parser from "rss-parser";

const API_URL = "https://api.coingecko.com/api/v3/simple/price";
const NEWS_FEEDS = [
    "https://cointelegraph.com/rss"
];

const COINS = [
    'bitcoin', 'ethereum', 'binancecoin', 'solana', 'cardano',
    'polkadot', 'avalanche-2', 'chainlink', 'uniswap', 'aave',
    'maker', 'compound-governance-token', 'yearn-finance', 'sushi',
    'curve-dao-token', 'dogecoin', 'shiba-inu', 'matic-network',
    'cosmos', 'near', 'pepe', 'floki', 'bonk', 'wojak'
];

interface MarketData {
    usd_24h_change?: number; // Optional because API might not return it
    usd?: number;            // Optional because API might not return it
    usd_24h_vol?: number;    // Optional because API might not return it
}

export const getMarketData = async () => {
    try {
        const response = await fetch(
            `${API_URL}?ids=${COINS.join(',')}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch crypto data');
        }

        const data = await response.json();
        elizaLogger.log("Market data fetched successfully.", { data });
        return data;
    } catch (error) {
        elizaLogger.error("Error fetching market data:", error.message || error);
        throw error;
    }
};

const formatDataItem = (item) => {
    if (!item.price || !item.volume || !item.change) {
        elizaLogger.error("Missing data in market item:", { item });
        return {
            coin: item.coin || "Unknown",
            formattedPrice: "N/A",
            formattedVolume: "N/A",
            change: 0,
        };
    }

    return {
        ...item,
        formattedPrice: item.price < 0.01 ? item.price.toFixed(8) : item.price.toFixed(2),
        formattedVolume: (item.volume / 1e9).toFixed(1)
    };
};

export const formatMarketData = (marketData: Record<string, MarketData>) => {
    const significantMovers = Object.entries(marketData)
        .map(([coin, data]) => ({
            coin,
            change: data.usd_24h_change || 0,
            price: data.usd || 0,
            volume: data.usd_24h_vol || 0
        }))
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    const categorize = (coins) =>
        significantMovers
            .filter(m => coins.includes(m.coin))
            .map(formatDataItem);

    const layer1s = categorize(['bitcoin', 'ethereum', 'solana', 'cardano', 'avalanche-2']);
    const defi = categorize(['uniswap', 'aave', 'maker', 'compound-governance-token']);
    const memecoins = categorize(['dogecoin', 'shiba-inu', 'pepe', 'floki', 'bonk', 'wojak']);
    const altcoins = categorize(['polkadot', 'cosmos', 'near', 'matic-network']);

    elizaLogger.log("Market data formatted successfully.", { layer1s, defi, memecoins, altcoins });
    return { layer1s, defi, memecoins, altcoins };
};

export const formatSection = (title, data) =>
    `${title}: ${data.map(m =>
        `$${m.coin.toUpperCase()} $${m.formattedPrice} (${m.change.toFixed(1)}% | Vol: $${m.formattedVolume}B)`
    ).join(', ')}`;

export const getCryptoNews = async () => {
    try {
        const parser = new Parser();
        const newsPromises = NEWS_FEEDS.map(feed => parser.parseURL(feed));
        const newsResults = await Promise.all(newsPromises);

        const articles = newsResults.flatMap(result =>
            result.items.map(item => ({
                title: item.title,
                link: item.link,
                pubDate: item.pubDate,
                source: result.title
            }))
        );

        elizaLogger.log("Crypto news fetched successfully.", { articles });
        return articles;
    } catch (error) {
        elizaLogger.error("Error fetching crypto news:", error.message || error);
        throw new Error("Failed to fetch crypto news. Please try again later.");
    }
};
