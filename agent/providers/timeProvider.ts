import {
    IAgentRuntime,
    Provider,
    Memory,
    elizaLogger
} from "@elizaos/core";

const timeProvider: Provider = {
    get: async (_runtime: IAgentRuntime, _message: Memory) => {
        const currentDate = new Date();
        const currentTime = currentDate.toLocaleTimeString("en-US");
        const currentYear = currentDate.getFullYear();

        const result = `The current time is: ${currentTime}, ${currentYear}`;
        elizaLogger.log(result);
        return result;
    },
};

export { timeProvider };