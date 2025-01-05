import fs from 'fs/promises';
import OpenAI from "openai";
import { fileURLToPath } from 'url';
import path from "path";
import { google } from 'googleapis';

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
const openai = new OpenAI({ apiKey });

// Google Sheets setup using API Key
const GOOGLE_API_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;
const sheets = google.sheets('v4');

// Define your Google Spreadsheet ID here
const SPREADSHEET_ID = '15F5xx-Gb7Pl50UmXL_WNqAzIs8uP0vDkRv6uP9fytSk';

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
                { role: "system", content: "You are a tweet maker based on your provided input (this is your personality)." },
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

// Generate a unique sheet name using the current date and commit hash
function generateSheetName() {
    const date = new Date().toISOString().split('T')[0];
    const commitSha = process.env.GITHUB_SHA?.substring(0, 7) || "manual-run";
    return `${date}-${commitSha}`;
}

// Append data to Google Sheets using the public API key
async function appendToGoogleSheet(table) {
    const sheetName = generateSheetName();

    // Create a new sheet in the Google Sheet
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        key: GOOGLE_API_KEY, // Using the public API Key here
        requestBody: {
            requests: [
                {
                    addSheet: {
                        properties: {
                            title: sheetName
                        }
                    }
                }
            ]
        }
    });

    // Prepare data for Google Sheets
    const values = [['ID', 'Input', 'Output']];
    table.forEach(row => {
        values.push([row.id, row.input, row.output]);
    });

    // Write data to the newly created sheet
    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        key: GOOGLE_API_KEY,  // Using the public API Key here
        requestBody: {
            values: values
        }
    });

    console.log(`✅ Data successfully written to Google Sheet: ${sheetName}`);
}

// Generate the interaction table with 5 examples and export to Google Sheets
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
    await appendToGoogleSheet(table);  // Save results to Google Sheets
}

// Run the script
generateInteractionTable();
