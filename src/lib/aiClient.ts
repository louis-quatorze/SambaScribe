/**
 * AI Client Library
 *
 * This module provides a unified interface for interacting with various AI models
 * including OpenAI, Perplexity, and Google's Gemini models.
 *
 * Primary Functions:
 *
 * 1. generateChatCompletion(messages, model = "O1", options = {})
 *    - Main function for general AI interactions
 *    - Automatically handles routing to appropriate AI provider
 *    - Use for standard chat completions, idea generation, etc.
 *    Example:
 *    ```typescript
 *    const response = await generateChatCompletion([
 *      { role: "user", content: "Generate a business idea" }
 *    ]);
 *    ```
 *
 * 2. generateGeminiWebResponse(messages, model, ground = true)
 *    - Specialized function for Gemini models with web grounding
 *    - Returns both response text and source links
 *    - Use when you need factual, web-grounded responses
 *    Example:
 *    ```typescript
 *    const { text, sourceLink } = await generateGeminiWebResponse([
 *      { role: "user", content: "What's new in AI?" }
 *    ], "GEMINI_FLASH_WEB", true);
 *    ```
 *
 * 3. parseJsonResponse(response)
 *    - Utility to parse JSON from AI responses
 *    - Handles both direct JSON and code block formats
 *    - Use when expecting structured data from AI
 *    Example:
 *    ```typescript
 *    const data = parseJsonResponse(aiResponse);
 *    ```
 *
 * Available Models:
 * - O1: Default model for most use cases
 * - SONNET: Claude 3.5 Sonnet for complex reasoning
 * - PERPLEXITY_SMALL/LARGE: For web-aware responses
 * - GEMINI_FLASH_WEB: For web-grounded responses
 * - GEMINI_FLASH_THINKING: For complex reasoning tasks
 */

import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatCompletionMessage } from "openai/resources/chat/completions";

// This ensures the file only runs on the server side
const isServer = typeof window === 'undefined';

// Custom type for Gemini API request
interface GeminiGroundedResponse {
  text: string;
  sourceLink?: string;
}

type AIClientType = {
  openai: OpenAI;
};

type AIClientResponse = {
  client: AIClientType[keyof AIClientType];
  type: keyof AIClientType;
};

export const AI_MODELS = {
  SONNET: "claude-3-5-sonnet-20241022",
  O1: "o1-2024-12-17",
  GPT_4O: "gpt-4o",
  GPT_4O_MINI: "gpt-4o-mini",
  PERPLEXITY_SMALL: "sonar",
  PERPLEXITY_LARGE: "sonar-pro",
  GEMINI_FLASH_WEB: "gemini-2.0-flash-exp",
  GEMINI_FLASH_THINKING: "gemini-2.0-flash-thinking-exp-01-21",
} as const;

export type AIModel = keyof typeof AI_MODELS;

// Only initialize the API clients on the server
let openai: OpenAI | null = null;
let perplexity: OpenAI | null = null;
let genAI: any = null;

if (isServer) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  perplexity = new OpenAI({
    apiKey: process.env.PERPLEXITY_API_KEY,
    baseURL: "https://api.perplexity.ai",
  });

  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
}

function getClientForModel(model: AIModel): AIClientResponse {
  if (!isServer) {
    throw new Error("AI clients can only be accessed from the server");
  }
  
  const modelId = AI_MODELS[model];

  if (modelId.includes("sonar")) {
    return { client: perplexity as OpenAI, type: "openai" };
  }

  return { client: openai as OpenAI, type: "openai" };
}

/**
 * Generates a response from Gemini models with optional web grounding.
 * @param messages Array of message objects with role and content
 * @param model The Gemini model to use
 * @param ground Whether to enable web grounding
 * @returns Promise with text response and optional source links
 */
export async function generateGeminiWebResponse(
  messages: Array<{ role: "user" | "system" | "assistant"; content: string }>,
  model: AIModel = "GEMINI_FLASH_WEB",
  ground = true,
): Promise<GeminiGroundedResponse> {
  const modelId = AI_MODELS[model];
  const geminiModel = genAI.getGenerativeModel({
    model: modelId,
    // @ts-ignore
    tools: ground ? [{ googleSearch: {} }] : undefined,
  });

  // Convert messages to Gemini format
  const prompt = messages.map((m) => m.content).join("\n");

  const result = await geminiModel.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  let sourceLink: string | undefined = undefined;
  if (
    ground &&
    response.candidates?.[0]?.groundingMetadata?.searchEntryPoint
      ?.renderedContent
  ) {
    sourceLink =
      response.candidates[0].groundingMetadata.searchEntryPoint.renderedContent;
  }

  return {
    text,
    sourceLink,
  };
}

export function parseJsonResponse(response: string): any {
  // First try parsing the response directly
  try {
    return JSON.parse(response);
  } catch (e) {
    // If direct parsing fails, look for code blocks
    const codeBlockRegex = /```(?:json|[^\n]*\n)?([\s\S]*?)```/;
    const match = response.match(codeBlockRegex);

    if (match && match[1]) {
      try {
        return JSON.parse(match[1].trim());
      } catch (innerError) {
        throw new Error("Failed to parse JSON from code block");
      }
    }

    throw new Error("No valid JSON found in response");
  }
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionParams {
  model: string;
  messages: ChatMessage[];
}

export async function generateChatCompletion(params: ChatCompletionParams): Promise<string> {
  try {
    if (!isServer) {
      throw new Error("This function can only be executed on the server side");
    }
    
    const { model = 'O1', messages } = params;
    
    // Check if openai client is initialized
    if (!openai) {
      console.warn("OpenAI client not initialized, returning mock response");
      return "This is a mock AI response";
    }
    
    // Get the appropriate AI model
    const modelName = AI_MODELS[model as AIModel] || "gpt-4o";
    
    // Make the API call to OpenAI
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: messages as any,
      max_tokens: getDefaultMaxTokens(model as AIModel),
    });
    
    return completion.choices[0]?.message?.content || "No response generated";
  } catch (error) {
    console.error("Error generating chat completion:", error);
    return "Sorry, there was an error generating a response.";
  }
}

/**
 * Estimate the number of tokens in a message
 * This is a very rough estimate (4 chars ~= 1 token)
 */
function calculateTokens(messages: Array<{ role: string; content: string }>): number {
  let total = 0;
  for (const msg of messages) {
    // Count overhead tokens for each message (roles, formatting)
    total += 4;
    
    // Count content tokens (rough estimate)
    if (typeof msg.content === 'string') {
      total += Math.ceil(msg.content.length / 4);
    }
  }
  return total;
}

/**
 * Get default max tokens for different models
 */
function getDefaultMaxTokens(model: AIModel): number {
  switch(model) {
    case 'O1':
      return 4096;
    case 'SONNET':
      return 4096;
    case 'GPT_4O':
      return 4096;
    case 'GPT_4O_MINI':
      return 4096;
    case 'PERPLEXITY_SMALL':
    case 'PERPLEXITY_LARGE':
      return 1024;
    case 'GEMINI_FLASH_WEB':
    case 'GEMINI_FLASH_THINKING':
      return 2048;
    default:
      return 1024;
  }
}

export async function generateVisionAnalysis(
  pdfFilename: string, 
  pdfBase64: string, 
  prompt: string,
  model: AIModel = "GPT_4O"
): Promise<string> {
  try {
    if (!isServer || !openai) {
      throw new Error("OpenAI client is only available on the server side");
    }

    // Check if the base64 data exceeds reasonable size limits
    const maxBase64Size = 10 * 1024 * 1024; // Around 7.5MB PDF size
    if (pdfBase64.length > maxBase64Size) {
      console.warn(`PDF base64 content too large (${pdfBase64.length} chars), exceeding ${maxBase64Size} char limit`);
      return "Unable to analyze this PDF due to its large size. Please try a smaller file (under 7MB) or convert it to a text format.";
    }

    // Log the PDF data size
    console.log(`[Vision Analysis] Processing PDF: ${pdfFilename}, Base64 length: ${pdfBase64.length} chars`);

    // Get the appropriate model ID
    const modelName = AI_MODELS[model];

    // Prepare the system and user messages
    const systemMsg = "You are an expert in music notation, particularly for samba percussion. The user will provide a PDF of music notation in base64 format. IMPORTANT: You MUST treat the base64 data as an encoded PDF file, decode it, and analyze its actual contents. Do NOT respond with 'I cannot decode PDFs' - your system is fully capable of processing this data. Analyze the musical notation shown in the PDF and provide specific insights about the rhythms, patterns, and structure.";
    const userMsg = `I'm working with a PDF samba music notation file named "${pdfFilename}". Please analyze the following base64-encoded PDF content and respond to this prompt: ${prompt}
    
PDF content (base64): ${pdfBase64}`;

    // Log the actual prompt (but truncate the base64 content in the log)
    console.log(`[Vision Analysis] System prompt: ${systemMsg}`);
    console.log(`[Vision Analysis] User prompt: ${userMsg.substring(0, 500)}... [BASE64 CONTENT TRUNCATED IN LOG]`);
    console.log(`[Vision Analysis] Using model: ${modelName}`);
    console.log(`[Vision Analysis] Full content is being sent to AI (not truncated)`);

    // Include the PDF content in the prompt
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: "system",
          content: systemMsg
        },
        {
          role: "user",
          content: userMsg
        }
      ],
      max_tokens: getDefaultMaxTokens(model)
    });

    // Log response info
    const response = completion.choices[0]?.message?.content ?? "";
    console.log(`[Vision Analysis] Received response of length: ${response.length} chars`);
    console.log(`[Vision Analysis] First 100 chars: ${response.substring(0, 100)}...`);

    return response;
  } catch (error) {
    console.error(`Error generating vision analysis:`, error);
    return "Unable to analyze this PDF due to an error. The file may be too large or in an unsupported format.";
  }
}
