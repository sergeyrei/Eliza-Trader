import { Plugin } from "@elizaos/core";
import { swapAction } from "./actions/swap";
import { aerodromeWalletProvider } from "./providers/wallet";

export const plugin: Plugin = {
    name: "aerodrome",
    description: "Aerodrome Finance plugin for Base chain",
    actions: [swapAction],
    providers: [aerodromeWalletProvider],
};

export { plugin as aerodromPlugin };
export default plugin;
