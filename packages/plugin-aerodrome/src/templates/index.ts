export const swapTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

Extract the following information about the requested Aerodrome swap:
- Input token address (the token being sold)
- Output token address (the token being bought)
- Amount to swap (in exact numbers, as a string representing ETH)
- Minimum amount to receive (slippage protection, default 1%, also as a string representing ETH)
- Recipient address (optional)

Common token addresses on Base:
- ETH: 0x4200000000000000000000000000000000000006
- USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
- AERO: 0x940181a94A35A4569E4529A3CDfB74e38FD98631

Respond with a JSON markdown block containing only the extracted values:

amount in should be max 0.00004 ETH

\`\`\`json
{
    "tokenIn": string,
    "tokenOut": string,
    "amountIn": string,
    "amountOutMinimum": string,
    "recipient": string | null
}
\`\`\`

Note:
- All amounts should be strings that will be converted to wei using parseEther
- Token addresses must be valid Ethereum addresses
- If recipient is not specified, it will default to the sender's address 0x987132a5c74144A16870132f5c05CD350072c517
`;
