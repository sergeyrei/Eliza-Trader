

import type { Plugin } from "@elizaos/core";
import { storyWalletProvider } from "./providers/wallet";
import { registerIPAction } from "./actions/registerIP";
import { licenseIPAction } from "./actions/licenseIP";
import { getAvailableLicensesAction } from "./actions/getAvailableLicenses";
import { getIPDetailsAction } from "./actions/getIPDetails";
import { attachTermsAction } from "./actions/attachTerms";

export const storyPlugin: Plugin = {
    name: "story",
    description: "Story integration plugin",
    providers: [],
    evaluators: [],
    services: [],
    actions: [
    ],
};

export default storyPlugin;
