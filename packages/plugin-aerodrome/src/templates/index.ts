export const swapTemplate = `Given the recent news, price data, and wallet information below:

{{cryptoData}}  - get recent news and coin values

Analyze the information provided to determine the best token to buy based on:
1. Positive or negative sentiment extracted from the news.
2. Price trends (e.g., tokens with upward or downward momentum).
3. Wallet holdings (e.g., avoiding overconcentration in a single asset).

Extract the following details for the recommended token swap:
- Input token symbol or address (the token being sold, based on wallet holdings).
- Output token symbol or address (the recommended token to buy).
- Amount to swap: A string representing the amount in ether (e.g., "0.0002"). Ensure the swap amount does not exceed 10% of the wallet's balance in the input token.
- Slippage: Use a percentage value (e.g., 95 for 5% slippage tolerance).
- Reason for the recommended swap: A brief explanation (e.g., "Token X is gaining momentum due to positive news and has a strong upward trend").

Common token addresses on Base:
- ETH: 0x4200000000000000000000000000000000000006
- USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
- AERO: 0x940181a94A35A4569E4529A3CDfB74e38FD98631
- USDT: 0xfde4c96c8593536e31f229ea8f37b2ada2699bb2
- DAI: 0x50c5725949a6f0c72e6c4a641f24049a917db0cb
- Virtual: 0x0b3e328455c4059eeb9e3f84b5543f74e24e7e1b
- SUI: 0xb0505e5a99abd03d94a1169e638b78edfed26ea4
- 1000X: 0x352b850b733ab8bab50aed1dab5d22e3186ce984
- ACOLYT: 0x79dacb99a8698052a9898e81fdf883c29efb93cb
- AIXCB: 0x76c71f1703fbf19ffdcf3051e1e684cb9934510f
- ANON: 0x0db510e79909666d6dec7f5e49370838c16d950f
- LUNA: 0x55cd6469f597452b5a7536e2cd98fde4c1247ee4
- STAR: 0xc19669a405067927865b40ea045a2baabbbe57f5
- XSWAP: 0x8fe815417913a93ea99049fc0718ee1647a2a07c
- ZEREBRO: 0xd2e92077ad4d7d50d7d60be13fffe3fb52cc0b9f


tokenIn is 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
tokenOut is determined by the processing to identify the best value
Recipient is 0x987132a5c74144A16870132f5c05CD350072c517

Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
    "tokenIn": string,
    "tokenOut": string,
    "amountIn": string,
    "amountOutMinimum": string,
    "recipient": string | null
}
\`\`\`


Guidelines:
- Base your recommendation on both sentiment analysis from the news and price trend analysis.
- For price data, consider short-term momentum (last 24 hours) and long-term trends (last 7 days).
- Avoid swaps that would result in a wallet imbalance or risk (e.g., swapping too much into a volatile or untrusted token).
- Ensure the swap parameters are realistic for execution on the specified blockchain.

Note:
- All amounts should be strings that will be converted to wei using parseEther
- Token addresses must be valid Ethereum addresses
`;
