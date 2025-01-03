import fs from 'fs/promises';
import OpenAI from "openai";
import { fileURLToPath } from 'url';
import path from "path";
import * as XLSX from "xlsx";

// Ensure correct path resolution for both local and CI environments
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        const filePath = path.resolve(__dirname, '../../characters/aisaylor.character.json');
        const rawData = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(rawData);
    } catch (error) {
        console.error("❌ Error reading input file:", error);
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

// Convert JSON data to an Excel file
async function generateExcel(table) {
    // Ensure the directory exists before writing the file
    const excelFilePath = path.join(__dirname, '../../agent/interaction_table.xlsx');
    try {
        const worksheet = XLSX.utils.json_to_sheet(table);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Interaction Table");

        // Create directories if they don't exist
        await fs.mkdir(path.dirname(excelFilePath), { recursive: true });
        XLSX.writeFile(workbook, excelFilePath);

        console.log(`✅ Excel file generated: ${excelFilePath}`);
        return excelFilePath;
    } catch (error) {
        console.error("❌ Error writing the Excel file:", error);
        process.exit(1);
    }
}

// Generate the interaction table with 10 examples and export to Excel
async function generateInteractionTable() {
    const inputData = await getInputData();
    console.log("✅ Input data loaded successfully:", inputData);
    const table = [];

    for (let i = 0; i < 5; i++) {
        const outputData = await getOpenAIResponse(inputData, i);
        table.push({
            id: i + 1,
            input: JSON.stringify(inputData),
            output: outputData
        });
    }

    console.table(table);
    await generateExcel(table);  // Save results as Excel file
}

// Run the script
generateInteractionTable();
