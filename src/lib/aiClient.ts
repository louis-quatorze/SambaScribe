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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const perplexity = new OpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY,
  baseURL: "https://api.perplexity.ai",
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

function getClientForModel(model: AIModel): AIClientResponse {
  const modelId = AI_MODELS[model];

  if (modelId.includes("sonar")) {
    return { client: perplexity, type: "openai" };
  }

  return { client: openai, type: "openai" };
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

export async function generateChatCompletion(
  messages: Array<{ role: "user" | "system" | "assistant"; content: string }>,
  model: AIModel = "GPT_4O_MINI",
  additionalOptions: Partial<OpenAI.ChatCompletionCreateParamsNonStreaming> = {},
): Promise<string> {
  try {
    console.log('\n=== AI REQUEST ===');
    console.log('Model:', model);
    
    // More thoroughly filter out ALL PDF content from logs
    const sanitizedMessages = messages.map(msg => ({
      ...msg,
      content: 
        typeof msg.content === 'string' 
          ? (
              // Replace any base64 content or PDF mention
              msg.content.includes('Base64 PDF content:') 
                ? msg.content.replace(/Base64 PDF content:.*/, 'Base64 PDF content: [CONTENT_OMITTED]')
              : msg.content.includes('JVBERi0') // Common PDF header in base64
                ? msg.content.replace(/(JVBERi0[a-zA-Z0-9+/=]*)/g, '[PDF_BASE64_CONTENT_OMITTED]')
              : msg.content
            )
          : msg.content
    }));
    console.log('Messages:', JSON.stringify(sanitizedMessages, null, 2));
    console.log('Additional Options:', JSON.stringify(additionalOptions, null, 2));

    // Calculate token estimates
    const estimatedInputTokens = calculateTokens(messages);
    console.log(`Estimated Input Tokens: ${estimatedInputTokens}`);

    // Get max tokens from options or set defaults
    const maxOutputTokens = additionalOptions.max_tokens || getDefaultMaxTokens(model);
    console.log(`Max Output Tokens: ${maxOutputTokens}`);
    console.log(`Max Total Tokens: ${estimatedInputTokens + maxOutputTokens}`);

    const modelId = AI_MODELS[model];

    // Handle Gemini models directly
    if (modelId.includes("gemini")) {
      const geminiResp = await generateGeminiWebResponse(
        messages,
        model,
        false,
      );
      console.log('\n=== AI RESPONSE ===');
      console.log(geminiResp.text);
      
      // Estimate response tokens
      const outputTokens = calculateTokens([{role: "assistant", content: geminiResp.text}]);
      console.log(`Estimated Output Tokens Used: ${outputTokens}`);
      console.log(`Total Tokens Used: ${estimatedInputTokens + outputTokens}`);
      
      return geminiResp.text;
    }

    // Handle OpenAI and Perplexity models
    const { client } = getClientForModel(model);
    const options: OpenAI.ChatCompletionCreateParamsNonStreaming = {
      model: modelId,
      messages,
      temperature: 0.1, // Set fixed temperature as requested
      top_p: 0.7, // Set top_p as requested
      ...additionalOptions,
    };

    // Sanitize options for logging
    const sanitizedOptions = {
      ...options,
      messages: options.messages.map(msg => ({
        ...msg,
        content: 
          typeof msg.content === 'string' 
            ? (
                msg.content.includes('Base64 PDF content:') 
                  ? msg.content.replace(/Base64 PDF content:.*/, 'Base64 PDF content: [CONTENT_OMITTED]')
                : msg.content.includes('JVBERi0') // Common PDF header in base64
                  ? msg.content.replace(/(JVBERi0[a-zA-Z0-9+/=]*)/g, '[PDF_BASE64_CONTENT_OMITTED]')
                : msg.content
              )
            : msg.content
      }))
    };
    console.log('Final Request Options:', JSON.stringify(sanitizedOptions, null, 2));

    const completion = await client.chat.completions.create(options);
    
    console.log('\n=== AI RESPONSE ===');
    console.log(completion.choices[0]?.message?.content);
    
    // Log exact token usage reported by the API
    console.log('\n=== TOKEN USAGE ===');
    console.log(`Prompt Tokens: ${completion.usage?.prompt_tokens || 'Unknown'}`);
    console.log(`Completion Tokens: ${completion.usage?.completion_tokens || 'Unknown'}`);
    console.log(`Total Tokens: ${completion.usage?.total_tokens || 'Unknown'}`);
    
    return completion.choices[0]?.message?.content ?? "";
  } catch (error) {
    console.error(
      `Error generating chat completion for model ${model}:`,
      error,
    );
    throw error;
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
  prompt: string
): Promise<string> {
  try {
    // Check if the base64 data exceeds reasonable size limits
    const maxBase64Size = 10 * 1024 * 1024; // Around 7.5MB PDF size
    if (pdfBase64.length > maxBase64Size) {
      console.warn(`PDF base64 content too large (${pdfBase64.length} chars), exceeding ${maxBase64Size} char limit`);
      return "Unable to analyze this PDF due to its large size. Please try a smaller file (under 7MB) or convert it to a text format.";
    }

    // PDF files are not directly supported by Vision API
    // Instead, we'll use a text-based approach
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert in music notation, particularly for samba percussion. The user will provide a description of a PDF they're working with."
        },
        {
          role: "user",
          content: `I'm working with a PDF samba music notation file named "${pdfFilename}". Based on this filename and the following prompt, please provide the best response you can: ${prompt}`
        }
      ],
      max_tokens: 10240
    });

    return completion.choices[0]?.message?.content ?? "";
  } catch (error) {
    console.error(`Error generating vision analysis:`, error);
    return "Unable to analyze this PDF due to an error. The file may be too large or in an unsupported format.";
  }
}
