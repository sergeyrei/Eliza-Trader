import {
    aerodromeWalletProvider,
    initWalletProvider,
} from "../providers/wallet";
import {
    Plugin,
    IAgentRuntime,
    Memory,
    State,
    ModelClass,
    generateObjectDeprecated,
    composeContext,
    elizaLogger,
} from "@elizaos/core";
import { ethers } from "ethers";
import { swapTemplate } from "../templates";

export const ROUTER_ADDRESS =
    "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43" as const;

export const swapAction = {
    name: "swapAction",
    similes: ["SWAP_ON_AERODROME", "PERFORM_EXCHANGE"],
    description: "Perform a token swap on Aerodrome Finance on Base chain",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback?: Function
    ) => {
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        console.log("Swap action handler called");
        const wallet = await initWalletProvider(runtime);

        const context = composeContext({
            state,
            template: swapTemplate,
        });

        const transferDetails = await generateObjectDeprecated({
            runtime,
            context,
            modelClass: ModelClass.SMALL,
        });

        const routerAddress = ROUTER_ADDRESS;
        const routerAbi = [
            "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external",
        ];

        const routerContract = new ethers.Contract(
            routerAddress,
            routerAbi,
            wallet
        );

        const tokenContract = new ethers.Contract(
            transferDetails.tokenIn,
            [
                "function approve(address spender, uint256 amount) external returns (bool)",
            ],
            wallet
        );
        const approveTx = await tokenContract.approve(
            routerAddress,
            ethers.parseUnits(transferDetails.amountIn, 18)
        );
        await approveTx.wait();
        console.log("Approval successful");

        try {
            const amountIn = ethers.parseUnits(transferDetails.amountIn, 18);
            const amountOutMinimum = ethers.parseUnits(
                transferDetails.amountOutMinimum,
                18
            );
            const path = [transferDetails.tokenIn, transferDetails.tokenOut];
            const recipient = transferDetails.recipient;
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

            elizaLogger.log("Swap parameters:", {
                amountIn,
                amountOutMinimum,
                path,
                recipient,
                deadline,
            });

            let tx;
            try {
                tx = await routerContract.swapExactTokensForTokens(
                    amountIn,
                    amountOutMinimum,
                    path,
                    recipient,
                    deadline
                );

                elizaLogger.log("Swap transaction:", { tx });
            } catch (error) {
                elizaLogger.log("Swap error:", { error });
                throw error;
            }

            if (tx) {
                await tx.wait();
                console.log(`Swap successful: ${tx.hash}`);
                if (callback) {
                    callback({
                        text: `Successfully swapped ${transferDetails.amountIn} tokens for ${transferDetails.tokenOut}`,
                        content: { success: true, hash: tx.hash },
                    });
                }
                return true;
            }
        } catch (error) {
            console.error("Swap failed:", error);
            if (callback) {
                callback({
                    text: `Error swapping tokens: ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },
    validate: async (runtime: IAgentRuntime) => {
        const privateKey = runtime.getSetting("EVM_PRIVATE_KEY");
        return typeof privateKey === "string" && privateKey.startsWith("0x");
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Swap 0.000004 ETH for USDC",
                    tokenIn: "ETH",
                    tokenOut: "USDC",
                    amount: "0.000004",
                },
            },
            {
                user: "{{user2}}",
                content: { text: "Swapping initiated", action: "swapAction" },
            },
        ],
    ],
};
