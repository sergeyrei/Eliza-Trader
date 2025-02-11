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
let totalTokensUsed = 0;
let results = [];

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

// Load full input data from JSON file
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
async function getOpenAIResponse(inputData, type, userMessage = null) {
    try {
        const systemPrompt = `You are a character AI assistant. Follow the bio, lore, style, and knowledge provided in the input data. 
        For tweets, generate an engaging tweet that fits the character.
        For chat replies, consider the example user messages to create an accurate response.
        Always maintain the defined tone and behavior of the character.`;

        let userPrompt = "";
        if (type === "post") {
            userPrompt = `Generate a tweet based on this file (follow all instructions), especially style: ${JSON.stringify(
                inputData
            )}`;
        } else if (type === "chat") {
            userPrompt = `Generate a chat reply based on this file and the provided user message. Follow all instructions:\n\nCharacter Data:\n${JSON.stringify(
                inputData
            )}\n\nUser Message: "${userMessage}"\n\nUser Message Examples:\n${JSON.stringify(
                inputData.messageExamples.slice(0, 5)
            )}`;
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            max_tokens: 2000,
        });

        totalTokensUsed += completion.usage.total_tokens;
        return completion.choices[0].message.content.trim();
    } catch (error) {
        console.error(`Error generating ${type} response:`, error);
        return "Error in generating response";
    }
}

// Generate evaluation score and reasoning
async function evaluateContent(content, type) {
    try {
        const evaluationPrompt = `Evaluate this ${type} on a scale of 0-100 based on:
        - Humor (0-30)
        - Engagement (0-30)
        - Relevance (0-40)
        Provide reasoning in strict format:
        - Score: [NUMBER]
        - Humor: [Brief reasoning]
        - Engagement: [Brief reasoning]
        - Relevance: [Brief reasoning]
        - Final verdict: [Short summary]
        
        Content: ${content}`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: evaluationPrompt }],
            max_tokens: 2000,
        });

        return completion.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error evaluating content:", error);
        return "Evaluation failed";
    }
}

// Generate and append an overall report to Google Sheets
async function generateOverallReport() {
    try {
        const prompt = `Analyze the following interactions and determine which parts of the input file (aisaylor.character.json) should be updated to improve responses.
        Provide structured feedback in the following format:
        
        - Sections to Update: [Exact JSON paths and strings needing updates]
        - Suggested Improvements: [Detailed recommended changes]
        - Expected Outcome: [How these changes will improve responses]
        - Total Tokens Used: [Total count and estimated cost]
        
        Results:
        ${JSON.stringify(results, null, 2)}`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 2000,
        });

        const report = completion.choices[0].message.content.trim();
        await appendOverallReport(report);
        return report;
    } catch (error) {
        console.error("Error generating overall report:", error);
        return "Report generation failed";
    }
}

// Append overall report to Google Sheet
async function appendOverallReport(report) {
    const values = [["Overall Report"]];
    values.push([report]);

    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Main!H1",
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values },
    });

    console.log("✅ Overall report added to Google Sheets.");
}

// Append data to "Main" Google Sheet
async function appendToGoogleSheet(table) {
    const values = [["ID", "Type", "Input", "Output", "Score", "Evaluation"]];
    results = [...table];

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

    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Main!A1",
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values },
    });

    console.log("✅ Data successfully appended to 'Main' Google Sheet.");

    // Generate and append the overall report
    const report = await generateOverallReport();
    console.log("\n📌 Overall Report:\n", report);
}

// Generate and store test cases
async function generateInteractionTable() {
    await cleanSheets();
    const inputData = await getInputData();
    console.log("✅ Input data loaded successfully.");

    const table = [];
    let id = Date.now();

    for (let i = 0; i < 5; i++) {
        const outputData = await getOpenAIResponse(inputData, "post");
        table.push({
            id: id++,
            type: "Post",
            input: "Generate a tweet",
            output: outputData,
        });
    }

    const messageExamples = inputData.messageExamples.slice(0, 10);
    for (let i = 0; i < messageExamples.length; i++) {
        const userMessage = messageExamples[i][0].content.text;
        const outputData = await getOpenAIResponse(
            inputData,
            "chat",
            userMessage
        );
        table.push({
            id: id++,
            type: "Chat Reply",
            input: userMessage,
            output: outputData,
        });
    }

    console.table(table);
    await appendToGoogleSheet(table);
}

// Run the script
generateInteractionTable();
