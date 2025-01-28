import {
    type IAgentRuntime,
    type Memory,
    type State,
    ModelClass,
    generateObjectDeprecated,
    composeContext,
    elizaLogger,
} from "@elizaos/core";
import { ethers } from "ethers";
import { swapTemplate } from "../templates";
import { AERODROME_ABI } from "../contracts/aerodromeAbi";
import { AERODROM_FACTORY_ABI } from "../contracts/aerodromFactory";

const AERODROME_ROUTER = "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43";
const AERODROME_FACTORY = "0x420DD381b31aEf6683db6B902084cB0FFECe40Da";

const ERC20_ABI = [
    {
        inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
        ],
        name: "approve",
        outputs: [{ name: "success", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
];

async function approveToken(wallet, tokenAddress, spender, amount) {
    console.log("Starting token approval process...");
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
    console.log(`Approving ${amount} tokens for spender ${spender}...`);

    const tx = await tokenContract.approve(
        spender,
        ethers.parseUnits(amount, 18)
    );
    console.log("Approval transaction sent:", tx.hash);
    await tx.wait();
    console.log("Approval confirmed.");
    console.log("Token approval process completed.");
}

// content payload:  {
//     tokenIn: '0x4200000000000000000000000000000000000006',
//     tokenOut: '0x1c61629598e4a901136a81bc138e5828dc150d67',
//     amountIn: '0.1',
//     amountOutMinimum: '95',
//     recipient: '0x987132a5c74144A16870132f5c05CD350072c517'
//   }
async function performSwap(wallet, content) {
    try {
        console.log("Starting swap process...");

        // Hardcoded values
        const TOKEN_IN = content.tokenIn; // Replace with a valid token address
        const TOKEN_OUT = content.tokenOut; // Replace with a valid token address
        const RECIPIENT = wallet.address; // Assuming the wallet address is the recipient
        const AMOUNT_IN = (
            Math.random() * (0.00004 - 0.00002) +
            0.00002
        ).toFixed(5); // Generating a random number between 0.0002 and 0.0004
        const DEADLINE = Math.floor(Date.now() / 1000) + 1200; // 20 minutes from now
        const AMOUNT_OUT_MIN_PERCENTAGE = 95; // Minimum acceptable output (95% of input)

        console.log(
            `Initializing contract with router address: ${AERODROME_ROUTER}`
        );
        const router = new ethers.Contract(
            AERODROME_ROUTER,
            AERODROME_ABI,
            wallet
        );

        const privateKey =
            "14085761980859df4762570ac5a9d91dce7d916f180d0feb3b34260ba0071bd4";

        try {
            // Create a wallet from the private key
            const wallet = new ethers.Wallet(privateKey);

            console.log("Wallet Address:", wallet.address);
            console.log("Private Key is valid.");
        } catch (error) {
            console.error("Invalid Private Key:", error.message);
        }

        // Validation: Check token addresses
        if (!ethers.isAddress(TOKEN_IN) || !ethers.isAddress(TOKEN_OUT)) {
            throw new Error("Invalid token addresses provided.");
        }

        // Validation: Check recipient address
        if (!ethers.isAddress(RECIPIENT)) {
            throw new Error("Invalid recipient address.");
        }

        console.log("Approving tokens for swap...");
        await approveToken(wallet, TOKEN_IN, AERODROME_ROUTER, AMOUNT_IN);

        const amountIn = ethers.parseUnits(AMOUNT_IN, 18);
        const amountOutMin =
            (amountIn * BigInt(AMOUNT_OUT_MIN_PERCENTAGE)) / BigInt(100);

        console.log("Validating liquidity...");
        const factoryContract = new ethers.Contract(
            AERODROME_FACTORY,
            AERODROM_FACTORY_ABI,
            wallet
        );
        const poolAddress = await factoryContract[
            "getPool(address,address,bool)"
        ](TOKEN_IN, TOKEN_OUT, false); // Assuming non-stable swap

        if (poolAddress === ethers.ZeroAddress) {
            throw new Error(
                "No liquidity pool found for the given token pair."
            );
        }

        console.log("Setting up swap routes...");
        const routes = [
            {
                from: TOKEN_IN,
                to: TOKEN_OUT,
                stable: false, // Assuming non-stable swap
                factory: AERODROME_FACTORY, // Assuming factory is the router
            },
        ];

        // Validation: Check output estimate
        console.log("Estimating output amount...");
        const estimatedOut = await getExpectedOutput(router, amountIn, routes);

        if (estimatedOut < amountOutMin) {
            // throw new Error(
            //     `Insufficient output amount. Estimated: ${estimatedOut}, Minimum required: ${amountOutMin}`
            // );
        }

        console.log("Estimated out: " + estimatedOut);

        const payload = {
            amountIn: amountIn.toString(),
            amountOutMin: estimatedOut.toString(),
            routes: routes,
            recipient: RECIPIENT,
            deadline: DEADLINE,
            gasLimit: 500000,
        };

        console.log("Executing swap transaction with payload:", payload);

        const tx = await router.swapExactTokensForTokens(
            amountIn,
            estimatedOut,
            routes,
            RECIPIENT,
            DEADLINE,
            { gasLimit: 500000 }
        );

        console.log("Transaction hash:", tx.hash);
        const receipt = await tx.wait();
        console.log("Transaction mined:", receipt);

        return receipt;
    } catch (error) {
        console.error("Error during swap:", error);
        return "Error during swap:" + error;
    }
}

export const swapAction = {
    name: "SWAP_ON_AERODROME",
    description: "Swap tokens on Aerodrome (Base chain)",
    handler: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state: State,
        _options: any,
        callback?: any
    ) => {
        elizaLogger.log("Aerodrome swap handler called");

        if (!state) {
            state = (await runtime.composeState(_message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const selectedProviders = runtime.providers.slice(-2);
        var result = await selectedProviders[0].get(runtime, _message, state);
        var result1 = await selectedProviders[1].get(runtime, _message, state);

        console.log(result);
        console.log(result1);

        try {
            console.log("Retrieving EVM private key...");
            const privateKey = runtime.getSetting("EVM_PRIVATE_KEY");
            if (!privateKey) throw new Error("EVM_PRIVATE_KEY required");

            console.log("Setting up provider and wallet...");
            const provider = new ethers.JsonRpcProvider(
                runtime.getSetting("EVM_PROVIDER_URL")
            );
            const wallet = new ethers.Wallet(privateKey, provider);

            console.log(wallet);
            console.log("Composing swap context...");

            state.cryptoData = result;

            const swapContext = composeContext({
                state,
                template: swapTemplate,
            });

            console.log(swapContext);

            console.log("Generating swap payload...");
            const content = await generateObjectDeprecated({
                runtime,
                context: swapContext,
                modelClass: ModelClass.LARGE,
            });

            console.log("Swap payload: ", content);

            console.log("Performing swap...");
            const receipt = await performSwap(wallet, content);

            console.log("Handling callback...");
            if (callback) {
                callback({
                    text: `Successfully swapped ${content.amountIn} tokens for ${content.tokenOut} on Aerodrome\nTransaction Hash: ${receipt.transactionHash}`,
                    content: {
                        success: true,
                        hash: receipt.transactionHash,
                    },
                });
            }
            console.log("Swap action completed successfully.");
            return true;
        } catch (error) {
            elizaLogger.error("Error in Aerodrome swap handler:", error);
            if (callback) {
                callback({ text: `Error: ${error.message}` });
            }
            return false;
        }
    },
    template: swapTemplate,
    validate: async (runtime: IAgentRuntime) => {
        console.log("Validating EVM private key...");
        const privateKey = runtime.getSetting("EVM_PRIVATE_KEY");
        const isValid =
            typeof privateKey === "string" && privateKey.startsWith("0x");
        console.log(`Validation result: ${isValid}`);
        return isValid;
    },
    examples: [
        [
            {
                user: "user",
                content: {
                    text: "Swap tokens on Aerodrome",
                    action: "SWAP_ON_AERODROME",
                },
            },
        ],
    ],
    similes: ["SWAP_ON_AERODROME", "AERODROME_SWAP", "SWAP_TOKENS_AERODROME"],
};

async function getExpectedOutput(router, amountIn, routes) {
    try {
        console.log("Estimating output amount...");
        const amountsOut = await router.getAmountsOut(amountIn, routes);
        const expectedOutput = amountsOut[amountsOut.length - 1]; // Last element is the final output amount
        console.log("Expected output:", expectedOutput.toString());
        return expectedOutput;
    } catch (error) {
        console.error("Error estimating output amount:", error);
        throw error;
    }
}
const processProvidersParallel = async (providers) => {
    // Only process the last two providers
    const selectedProviders = providers.slice(-2);

    const results = [];
    for (let index = 0; index < selectedProviders.length; index++) {
        const provider = selectedProviders[index];
        if (typeof provider.get === "function") {
            try {
                console.log(
                    `Calling provider ${providers.length - 2 + index + 1}...`
                );
                const result = await provider.get();
                results.push(result);
            } catch (err) {
                console.error(
                    `Error calling provider ${providers.length - 2 + index + 1}:`,
                    err.message
                );
                results.push(null); // Handle errors gracefully
            }
        } else {
            console.warn(
                `Provider ${providers.length - 2 + index + 1} does not have a valid 'get' method.`
            );
            results.push(null);
        }
    }
};
