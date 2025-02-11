import fs from "fs/promises";
import OpenAI from "openai";
import { fileURLToPath } from "url";
import path from "path";
import { google } from "googleapis";

// Ensure correct path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load API keys
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
    console.error("❌ Missing OpenAI API Key.");
    process.exit(1);
}

// Initialize OpenAI client
const openai = new OpenAI({ apiKey });

// Load Google Sheets API credentials
const GOOGLE_SERVICE_ACCOUNT_CREDENTIALS = JSON.parse(
    process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS
);
if (!GOOGLE_SERVICE_ACCOUNT_CREDENTIALS) {
    console.error("❌ Missing GOOGLE_SERVICE_ACCOUNT_CREDENTIALS API Key.");
    process.exit(1);
}

const auth = new google.auth.GoogleAuth({
    credentials: GOOGLE_SERVICE_ACCOUNT_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

// Define Google Spreadsheet ID
const SPREADSHEET_ID = "15F5xx-Gb7Pl50UmXL_WNqAzIs8uP0vDkRv6uP9fytSk";

// Helper function to remove all sheets except "Main"
async function cleanSheets() {
    const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
    });
    const sheetIdsToDelete = spreadsheet.data.sheets
        .filter((sheet) => sheet.properties.title !== "Main")
        .map((sheet) => sheet.properties.sheetId);

    if (sheetIdsToDelete.length > 0) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: sheetIdsToDelete.map((sheetId) => ({
                    deleteSheet: { sheetId },
                })),
            },
        });
        console.log("✅ Removed all sheets except 'Main'.");
    }
}

// Load input data from JSON file
async function getInputData() {
    try {
        const filePath = path.resolve(
            __dirname,
            "../../characters/aisaylor.character.json"
        );
        const rawData = await fs.readFile(filePath, "utf-8");
        return JSON.parse(rawData);
    } catch (error) {
        console.error("❌ Error reading input file:", error);
        process.exit(1);
    }
}

// Generate response from OpenAI
async function getOpenAIResponse(input, type, index) {
    try {
        const prompt =
            type === "post"
                ? `Generate an engaging tweet based on this input: ${JSON.stringify(
                      input
                  )}`
                : `Generate a sarcastic and engaging chat reply based on this user message: ${JSON.stringify(
                      input
                  )}`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1000,
        });

        return completion.choices[0].message.content.trim();
    } catch (error) {
        console.error(
            `Error calling OpenAI API for ${type} example ${index + 1}:`,
            error
        );
        return "Error in generating response";
    }
}

// Generate evaluation score and reasoning
async function evaluateContent(content, type) {
    try {
        const evaluationPrompt = `
        Evaluate this ${type} on a scale of 0-100 based on:
        - Humor (0-30)
        - Engagement (0-30)
        - Relevance to trading/micro market making (0-40)
        Provide reasoning in strict format:
        - Score: [NUMBER]
        - Humor: [Brief reasoning]
        - Engagement: [Brief reasoning]
        - Relevance: [Brief reasoning]
        - Final verdict: [Short summary]
        
        Content: ${content}
        `;

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: evaluationPrompt }],
            max_tokens: 500,
        });

        return completion.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error evaluating content:", error);
        return "Evaluation failed";
    }
}

// Append data to "Main" Google Sheet
async function appendToGoogleSheet(table) {
    const values = [
        ["ID", "Type", "Input", "Output", "Score", "Evaluation"],
        ["---", "---", "---", "---", "---", "---"],
    ];

    for (const row of table) {
        const evaluation = await evaluateContent(row.output, row.type);
        const [_, scoreLine, ...reasoningLines] = evaluation.split("\n");
        const score = scoreLine.split(":")[1]?.trim() || "0";

        values.push([
            row.id,
            row.type,
            row.input,
            row.output,
            score,
            reasoningLines.join("\n"),
        ]);
    }

    // Append to "Main" Sheet
    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Main!A1",
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values },
    });

    console.log("✅ Data successfully appended to 'Main' Google Sheet.");
}

// Generate and store test cases
async function generateInteractionTable() {
    await cleanSheets(); // Remove all sheets except "Main"

    const inputData = await getInputData();
    console.log("✅ Input data loaded successfully.");

    const table = [];
    let id = Date.now();

    // Generate 5 X posts
    for (let i = 0; i < 5; i++) {
        const outputData = await getOpenAIResponse(inputData.bio, "post", i);
        table.push({
            id: id++,
            type: "Post",
            input: "Generate an engaging tweet based on trading humor",
            output: outputData,
        });
    }

    // Generate 10 chat replies
    const messageExamples = inputData.messageExamples.slice(0, 10);
    for (let i = 0; i < messageExamples.length; i++) {
        const userMessage = messageExamples[i][0].content.text;
        const outputData = await getOpenAIResponse(userMessage, "chat", i);
        table.push({
            id: id++,
            type: "Chat Reply",
            input: userMessage,
            output: outputData,
        });
    }

    console.table(table);
    await appendToGoogleSheet(table); // Save results to Google Sheets
}

// Run the script
generateInteractionTable();
