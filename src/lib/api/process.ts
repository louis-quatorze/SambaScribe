import { AiNotationData } from "@/lib/types";
import { generateChatCompletion } from "@/lib/aiClient";

export async function processFile(fileUrl: string): Promise<AiNotationData> {
  try {
    // 1. Get file content from URL
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    const content = await response.text();

    // Extract filename from URL
    const filename = new URL(fileUrl).pathname.split('/').pop() || 'unknown.pdf';

    // 2. Generate title using AI
    const title = await generateChatCompletion({
      model: 'O1',
      messages: [
        {
          role: "system" as const,
          content: "You are a helpful assistant that generates concise, descriptive titles for documents. Generate a title that captures the main topic or theme."
        },
        {
          role: "user" as const,
          content: `Please generate a title for this document:\n\n${content}`
        }
      ]
    });

    // 3. Generate summary using AI
    const summary = await generateChatCompletion({
      model: 'O1',
      messages: [
        {
          role: "system" as const,
          content: "You are a helpful assistant that generates concise summaries of documents. Generate a summary that captures the main points and key ideas."
        },
        {
          role: "user" as const,
          content: `Please generate a summary for this document:\n\n${content}`
        }
      ]
    });

    // 4. Generate key points using AI
    const keyPointsResponse = await generateChatCompletion({
      model: 'O1',
      messages: [
        {
          role: "system" as const,
          content: "You are a helpful assistant that extracts key points from documents. List the most important points as a JSON array of strings."
        },
        {
          role: "user" as const,
          content: `Please extract key points from this document and return them as a JSON array of strings:\n\n${content}`
        }
      ]
    });
    const keyPoints = JSON.parse(keyPointsResponse);

    // 5. Generate mnemonics using AI
    const mnemonicsResponse = await generateChatCompletion({
      model: 'O1',
      messages: [
        {
          role: "system" as const,
          content: "You are a helpful assistant that creates memorable mnemonics to help remember key concepts. Generate a list of mnemonics as a JSON array of objects, each with 'text', 'pattern', and 'description' fields."
        },
        {
          role: "user" as const,
          content: `Please create mnemonics for the key points in this document. Return them in this format:
[
  {
    "text": "the mnemonic text",
    "pattern": "the pattern or concept it helps remember",
    "description": "brief description of how it helps"
  }
]

Key points to create mnemonics for:
${keyPoints.join('\n')}`
        }
      ]
    });
    const mnemonics = JSON.parse(mnemonicsResponse);

    // 6. Return processed data
    return {
      id: crypto.randomUUID(),
      title,
      content,
      summary,
      keyPoints,
      createdAt: new Date(),
      filename,
      aiSummary: summary, // Using the same summary for both fields
      mnemonics
    };
  } catch (error) {
    console.error("Error processing file:", error);
    throw error;
  }
} 