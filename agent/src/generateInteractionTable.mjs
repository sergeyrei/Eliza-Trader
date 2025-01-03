import fs from 'fs/promises';
import OpenAI from "openai";

// Load the API key from environment variables (for GitHub Secrets)
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
    console.error("❌ Missing OpenAI API Key.");
    process.exit(1);
}

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Helper function to get data from the JSON file
async function getInputData() {
    try {
        const rawData = await fs.readFile('../../characters/aisaylor.character.json', 'utf-8');
        return JSON.parse(rawData);
    } catch (error) {
        console.error("Error reading input file:", error);
        process.exit(1);
    }
}

// Generate response from OpenAI for a given input
async function getOpenAIResponse(input, index) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: "You are a tweet maker based on your provided input(this is your personality)" },
                { role: "user", content: `Example ${index + 1}: Generate an engaging tweet based on this input: ${JSON.stringify(input)}` }
            ],
            max_tokens: 100
        });
        return completion.choices[0].message.content.trim();
    } catch (error) {
        console.error(`Error calling OpenAI API for example ${index + 1}:`, error);
        return "Error in generating response";
    }
}

// Generate the interaction table with 10 examples
async function generateInteractionTable() {
    const inputData = await getInputData();
    const table = [];

    for (let i = 0; i < 5; i++) {
        const outputData = await getOpenAIResponse(inputData, i);
        table.push({
            id: i + 1,
            input: inputData,
            output: outputData
        });
    }

    console.table(table);
    await fs.writeFile('interaction_table.json', JSON.stringify(table, null, 2));
    console.log("✅ Interaction table generated: interaction_table.json");
}

// Run the script
generateInteractionTable();
