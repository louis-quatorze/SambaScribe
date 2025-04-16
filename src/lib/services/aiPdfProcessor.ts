import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { generateChatCompletion } from '@/lib/aiClient';
import { existsSync, mkdirSync } from 'fs';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { fileURLToPath } from 'url';

// Get current filename (for relative paths)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Kept s3 client definition as provided
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

export interface AiNotationData {
  filename: string;
  aiSummary: string;
  mnemonics: Array<{
    text: string;
    pattern?: string;
    description?: string;
  }>;
}

// Special mnemonics for specific patterns
const specialMnemonics = {
};

// Default section identifiers for samba notation
const DEFAULT_SECTION_IDENTIFIERS = ['Intro', 'Groove', 'Break', 'Outro'];

// Default fallback mnemonics
const FALLBACK_MNEMONICS = [
  { text: "DUM ka DUM ka", pattern: "Basic Pattern", description: "even quarter notes" }
];

/**
 * Convert markdown-style bold formatting to HTML bold tags
 * Replaces **text** with <b>text</b>
 */
function formatSummaryAsHtml(summary: string): string {
  if (!summary) return '';
  
  // If the text already contains proper HTML tags, return it as is
  if (summary.includes('<b>') && !summary.includes('**')) {
    return summary;
  }
  
  // If the text contains escaped HTML entities, unescape them first
  const unescapedSummary = summary
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  
  // Replace **text** with <b>text</b>
  // The regex matches ** followed by any characters (non-greedy) until the next **
  return unescapedSummary.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
}

// --- UPDATED: Reads from local 'samples' folder, sends base64 PDF or text to AI ---
export async function aiProcessFile(
    filename: string
): Promise<AiNotationData> {
    let buffer: Buffer;
    const isPdf = filename.toLowerCase().endsWith('.pdf');
    let fileContent: string;

    try {
        // Always read from the local 'samples' directory
        const samplesDir = join(__dirname, 'samples');
        if (!existsSync(samplesDir)) {
            throw new Error(`Samples directory not found at ${samplesDir}.`);
        }
        const filePath = join(samplesDir, filename);
        if (!existsSync(filePath)) {
            throw new Error(`Sample file not found: ${filename} in ${samplesDir}`);
        }
        buffer = await readFile(filePath);

        // Process buffer content based on file type
        if (isPdf) {
            fileContent = buffer.toString('base64'); // If PDF, encode to base64
        } else {
            fileContent = buffer.toString('utf-8'); // Otherwise treat as text.
        }

        // Call combined AI function, passing the isPdf flag
        const combinedResult = await generateSummaryAndMnemonics(filename, fileContent, isPdf);

        let aiSummary = combinedResult.summary;
        let mnemonics = combinedResult.mnemonics;

        aiSummary = formatSummaryAsHtml(aiSummary);

        return {
            filename,
            aiSummary,
            mnemonics
        };

    } catch (error) {
        console.error(`AI processing error for sample file ${filename}:`, error);
        return {
            filename: filename || 'unknown-file',
            aiSummary: `Unable to analyze file. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            mnemonics: FALLBACK_MNEMONICS // Use the global fallback defined earlier
        };
    }
}

// --- UPDATED: Simplified and focused prompt, handles base64 PDF or text --- 
async function generateSummaryAndMnemonics(
    filename: string,
    content: string,  // Expects base64 PDF or plain text
    isPdf: boolean   // Flag to determine content type
): Promise<{ summary: string; mnemonics: Array<{ text: string; pattern?: string; description?: string }> }> {

    // Base prompt adjusted based on whether the content is a PDF (base64) or text
    const basePrompt = isPdf ?
        `Analyze the samba music notation in this PDF (base64 encoded). Summarize in under 100 words and generate rhythm mnemonics. Output ONLY a valid JSON object with "summary" and "mnemonics" keys.` :
        `Analyze the samba music notation in this text. Summarize in under 100 words and generate rhythm mnemonics. Output ONLY a valid JSON object with "summary" and "mnemonics" keys.`;

    // Construct the message payload for the AI
    const messages = [
        {
            role: 'user' as const,
            // Include the content directly in the message, indicating if it's base64 or text
            content: isPdf ? `${basePrompt}\n\nBase64 PDF content for "${filename}":\n${content}` : `${basePrompt}\n\nText content for "${filename}":\n${content}`
        }
    ];

    let aiResponse: string | null = null; // Correct type based on generateChatCompletion

    try {
        aiResponse = await generateChatCompletion({
            model: "GPT_4O", // Ensure the model supports vision if needed for base64 PDFs
            messages: messages, // Use the structured messages array
            temperature: 0.5,
            top_p: 0.8,
            max_tokens: 1500 // Limiting the OUTPUT tokens
        });

        console.log("Full AI Response:", aiResponse);

        if (!aiResponse) {
             throw new Error("AI response was null or empty.");
        }
        const parsedResponse = JSON.parse(aiResponse);
        return parsedResponse;

    } catch (error) {
        console.error("Error in generateSummaryAndMnemonics:", error);
        if (aiResponse) { // Log the raw string response if available
            console.error("Raw AI response (if available):", aiResponse);
        }
        throw new Error(`AI processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// --- REMOVE OLD TEXT-BASED AI FUNCTION --- 
/*
async function generateSummaryAndMnemonics(
    filename: string,
    content: string  // Now expects plain text content (PDF converted)
): Promise<{ summary: string; mnemonics: Array<{ text: string; pattern: string; description: string }> }> {
    // ... implementation removed ...
}
*/


// --- REMOVE OLD FUNCTIONS --- (Ensure any previously defined generateSummaryAndMnemonics are removed)
/*
async function previousVersionOfGenerateSummaryAndMnemonics(...) {
  // ... implementation removed ...
}
*/
// --- END REMOVE OLD FUNCTIONS --- 