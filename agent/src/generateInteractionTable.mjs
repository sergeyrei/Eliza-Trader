import fs from 'fs/promises';
import { Configuration, OpenAIApi } from "openai";

// Load the API key from environment variables (for GitHub Secrets)
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
    console.error("❌ Missing OpenAI API Key.");
    process.exit(1);
}

// Initialize OpenAI client
const openai = new OpenAIApi(new Configuration({ apiKey }));

// Helper function to get data from the JSON file
async function getInputData() {
    try {
        const rawData = await fs.readFile('characters/aisaylor.character.json', 'utf-8');
        return JSON.parse(rawData);
    } catch (error) {
        console.error("Error reading input file:", error);
        process.exit(1);
    }
}

// Generate response from OpenAI
async function getOpenAIResponse(input) {
    try {
        const completion = await openai.createCompletion({
            model: "gpt-4",
            prompt: `Generate a response based on this input(create engagent tweet): ${JSON.stringify(input)}`,
            max_tokens: 100
        });
        return completion.data.choices[0].text.trim();
    } catch (error) {
        console.error("Error calling OpenAI API:", error);
        return "Error in generating response";
    }
}

// Generate the interaction table
async function generateInteractionTable() {
    const inputData = await getInputData();
    const outputData = await getOpenAIResponse(inputData);

    const table = [
        {
            id: 1,
            input: inputData,
            output: outputData
        }
    ];

    console.table(table);
    await fs.writeFile('interaction_table.json', JSON.stringify(table, null, 2));
    console.log("✅ Interaction table generated: interaction_table.json");
}

// Run the script
generateInteractionTable();