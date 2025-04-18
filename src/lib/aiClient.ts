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
import Anthropic from "@anthropic-ai/sdk";

// This ensures the file only runs on the server side
const isServer = typeof window === 'undefined';

// Custom type for Gemini API request
interface GeminiGroundedResponse {
  text: string;
  sourceLink?: string;
}

type AIClientType = {
  openai: OpenAI;
  anthropic: Anthropic;
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
let anthropic: Anthropic | null = null;

if (isServer) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  perplexity = new OpenAI({
    apiKey: process.env.PERPLEXITY_API_KEY,
    baseURL: "https://api.perplexity.ai",
  });

  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

function getClientForModel(model: AIModel): AIClientResponse {
  if (!isServer) {
    throw new Error("AI clients can only be accessed from the server");
  }
  
  const modelId = AI_MODELS[model];

  if (modelId.includes("sonar")) {
    return { client: perplexity as OpenAI, type: "openai" };
  }
  
  if (modelId.includes("claude")) {
    return { client: anthropic as Anthropic, type: "anthropic" };
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
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  top_k?: number;
}

export async function generateChatCompletion(params: ChatCompletionParams): Promise<string> {
  try {
    if (!isServer) {
      throw new Error("This function can only be executed on the server side");
    }
    
    const {
       model = 'GPT_4O',
       messages,
       temperature,
       max_tokens,
       top_p,
    } = params;
    
    const modelName = AI_MODELS[model as AIModel] || "gpt-4o";
    const isClaude = modelName.includes("claude");
    
    // If this is a Claude model and we have the Anthropic client initialized
    if (isClaude && anthropic) {
      console.log("[Chat Completion] Using Anthropic API for Claude model:", modelName);
      
      // Convert the messages format for Anthropic
      const systemMessage = messages.find(m => m.role === 'system')?.content || "";
      const userAssistantMessages = messages.filter(m => m.role !== 'system');
      
      // Create the Anthropic message format
      const anthropicMessages = userAssistantMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));
      
      // Create request payload
      const requestPayload: Anthropic.MessageCreateParams = {
        model: modelName,
        messages: anthropicMessages as any,
        max_tokens: max_tokens ?? getDefaultMaxTokens('SONNET'),
        system: systemMessage
      };
      
      // Add temperature if provided and valid for Anthropic
      if (temperature !== undefined) {
        requestPayload.temperature = temperature;
      }
      
      // Add top_p if provided and valid for Anthropic 
      if (top_p !== undefined) {
        requestPayload.top_p = top_p;
      }
      
      // Log with limited content for large messages
      const truncatedPayload = JSON.parse(JSON.stringify(requestPayload));
      if (truncatedPayload.messages) {
        truncatedPayload.messages = truncatedPayload.messages.map((msg: any) => {
          if (typeof msg.content === 'string' && msg.content.length > 1000) {
            return {
              ...msg,
              content: msg.content.substring(0, 500) + '... [CONTENT TRUNCATED IN LOG]'
            };
          }
          return msg;
        });
      }
      
      console.log("[Chat Completion] Sending Anthropic API request with payload:", truncatedPayload);
      
      // Make the API call
      const response = await anthropic.messages.create(requestPayload);
      
      console.log("[Chat Completion] Received Anthropic API response:", response);
      
      // Handle text content from Anthropic response
      if (response.content?.[0]?.type === 'text') {
        return response.content[0].text;
      }
      
      // If not text type, return empty string or any fallback
      return "No text content in the response";
    }
    
    // For non-Claude models, use the existing OpenAI call path
    if (!openai) {
      console.warn("OpenAI client not initialized, returning mock response");
      return "This is a mock AI response";
    }
    
    // Consider O1 as having the same parameter restrictions as Claude
    const isO1 = model === "O1" || modelName === "o1-2024-12-17";
    
    // Create base payload first without any token limit parameters
    const requestPayload: any = {
      model: modelName,
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
    };

    // Add parameters only for models that support them
    if (!isO1) {
      // Parameters for standard OpenAI models
      if (temperature !== undefined) requestPayload.temperature = temperature;
      if (top_p !== undefined) requestPayload.top_p = top_p;
    } else {
      // O1 only supports max_tokens
      requestPayload.max_tokens = max_tokens ?? getDefaultMaxTokens(model as AIModel);
    }

    // Truncate large message content before logging
    const truncatedPayload = JSON.parse(JSON.stringify(requestPayload));
    truncatedPayload.messages = truncatedPayload.messages.map((msg: any) => {
      if (typeof msg.content === 'string' && msg.content.length > 1000) {
        return {
          ...msg,
          content: msg.content.substring(0, 500) + '... [CONTENT TRUNCATED IN LOG]'
        };
      }
      return msg;
    });

    console.log("[Chat Completion] Sending OpenAI API request with payload:", truncatedPayload);

    const completion = await openai.chat.completions.create(requestPayload);
    
    console.log("[Chat Completion] Received raw API completion object:");
    console.log(JSON.stringify(completion, null, 2));

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
    const maxBase64Size = 15 * 1024 * 1024; // Around 7.5MB PDF size
    if (pdfBase64.length > maxBase64Size) {
      console.warn(`PDF base64 content too large (${pdfBase64.length} chars), exceeding ${maxBase64Size} char limit`);
      return "Unable to analyze this PDF due to its large size. Please try a smaller file (under 7MB) or convert it to a text format.";
    }

    // Log the PDF data size
    console.log(`[Vision Analysis] Processing PDF: ${pdfFilename}, Base64 length: ${pdfBase64.length} chars`);

    // Get the appropriate model ID
    const modelName = AI_MODELS[model];
    // Consider O1, Claude models for parameter restrictions
    const isClaude = modelName.includes("claude") || model === "O1" || modelName === "o1-2024-12-17";

    // Prepare the system and user messages
    const systemMsg = "You are an expert in music notation, particularly for samba percussion. The user will provide a PDF of music notation in base64 format. IMPORTANT: You MUST treat the base64 data as an encoded PDF file, decode it, and analyze its actual contents. Do NOT respond with 'I cannot decode PDFs' - your system is fully capable of processing this data. Analyze the musical notation shown in the PDF and provide specific insights about the rhythms, patterns, and structure.";
    
    // Separate the text prompt part from the base64 content reference
    const textPromptPart = `I'm working with a PDF samba music notation file named \"${pdfFilename}\". Please analyze the PDF content provided alongside this text and respond to this prompt: ${prompt}`;

    // Log the actual prompt (but truncate the base64 content in the log)
    console.log(`[Vision Analysis] System prompt: ${systemMsg}`);
    console.log(`[Vision Analysis] User text prompt part: ${textPromptPart}`);
    console.log(`[Vision Analysis] Using model: ${modelName}`);
    console.log(`[Vision Analysis] Base64 content length being sent: ${pdfBase64.length}`); 

    // Structure the message content correctly for Vision API
    const requestPayload: any = {
      model: modelName,
      messages: [
        {
          role: "system" as const,
          content: systemMsg
        },
        {
          role: "user" as const,
          // Content must be an array for multimodal input
          content: [
            {
              type: "text" as const,
              text: textPromptPart
            },
            {
              type: "image_url" as const,
              image_url: {
                // Prepend the necessary data URI scheme for base64 PDF
                url: `data:application/pdf;base64,${pdfBase64}`,
                // Detail level can be adjusted if needed, 'auto' is default
                // detail: "auto" 
              }
            }
          ]
        }
      ]
    };
    
    // Add the appropriate token limit parameter based on model type
    if (isClaude) {
      // For Claude models, use max_completion_tokens
      requestPayload.max_completion_tokens = getDefaultMaxTokens(model);
      // Claude doesn't support temperature, top_p, etc.
    } else {
      // For OpenAI models, we don't add max_tokens to avoid parameter issues
      // Consider adding other parameters like temperature if needed in the future
    }

    // --- Enhanced Logging START ---
    console.log("[Vision Analysis] Preparing to send API request with payload:");
    // Deep clone and truncate base64 for logging
    const loggedPayload = JSON.parse(JSON.stringify(requestPayload));
    if (Array.isArray(loggedPayload.messages[1].content)) {
      const imageContent = loggedPayload.messages[1].content.find((item: any) => item.type === 'image_url');
      if (imageContent && imageContent.image_url && imageContent.image_url.url) {
          const url = imageContent.image_url.url;
          const base64Start = url.indexOf('base64,') + 7;
          const base64Length = url.length - base64Start;
          imageContent.image_url.url = 
            url.substring(0, base64Start) + 
            '[BASE64 DATA: ' + 
            (base64Length > 1024 ? `${(base64Length/1024).toFixed(1)}KB` : `${base64Length} chars`) + 
            ' TRUNCATED IN LOG]';
      }
    }
    console.log(JSON.stringify(loggedPayload, null, 2));
    // --- Enhanced Logging END ---

    const completion = await openai.chat.completions.create(requestPayload);

    // --- Enhanced Logging START ---
    console.log("[Vision Analysis] Received raw API completion object:");
    console.log(JSON.stringify(completion, null, 2));
    // --- Enhanced Logging END ---

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

/**
 * Analyzes a PDF music sheet file by converting it to base64 and sending it to an AI model.
 * This function is specifically designed for music sheet analysis and mnemonic generation.
 * 
 * @param file The PDF file to analyze
 * @param prompt Custom prompt to guide the AI analysis
 * @param params Optional parameters to control AI behavior (temperature, top_p, top_k)
 * @returns Promise with AI analysis result
 */
export async function analyzeMusicSheetPdf(
  file: File,
  prompt?: string,
  params?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    model?: AIModel;
  }
): Promise<{
  analysis: string;
  mnemonics: Array<{
    text: string;
    pattern?: string;
    description?: string;
  }>;
}> {
  try {
    if (!isServer) {
      throw new Error("This function can only be executed on the server side");
    }

    // Check file type
    if (file.type !== "application/pdf") {
      throw new Error("Only PDF files are supported for music sheet analysis");
    }

    // Check file size (limit to 15MB)
    const MAX_FILE_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds the maximum allowed size of ${Math.floor(MAX_FILE_SIZE / (1024 * 1024))}MB`);
    }

    // Get the file name
    const filename = file.name;
    
    // Convert the file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    
    // Determine if we need to truncate the base64 data
    // Claude models have stricter input limits than OpenAI models
    const modelToUse = params?.model || "SONNET"; // Using Claude Sonnet as default
    const modelNameStr = AI_MODELS[modelToUse];
    // Check if this is a Claude model
    const isClaude = modelNameStr.includes("claude");
    
    // Maximum base64 chars (Claude models have stricter limits)
    const MAX_BASE64_LENGTH = isClaude ? 
      500000 : // Claude models - conservative limit
      1000000; // Other models - higher limit
    
    let truncatedBase64 = base64;
    let wasFileTruncated = false;
    
    if (base64.length > MAX_BASE64_LENGTH) {
      console.warn(`[Music Sheet Analysis] PDF base64 content too large (${base64.length} chars), truncating to ${MAX_BASE64_LENGTH} chars`);
      truncatedBase64 = base64.substring(0, MAX_BASE64_LENGTH);
      wasFileTruncated = true;
    }
    
    console.log(`[Music Sheet Analysis] Processing PDF: ${filename}, Base64 length: ${truncatedBase64.length} chars${wasFileTruncated ? ' (truncated)' : ''}`);
    
    // Default prompt if none provided
    const defaultPrompt = "Act as a music analyst for a samba piece. Your task is to offer a concise summary of the composition, identifying its style, the type of samba (if recognizable), and the general instrumentation or ensemble setup. Pinpoint rhythm patterns, breaks, section labels, and captions from the file, and outline the overall structure and flow of the piece based on these elements. For each unique rhythm or break, devise a mnemonic entry. Deliver your complete response in the provided JSON format: {\"summary\": \"brief piece description and structure\", \"mnemonics\": [{\"pattern\": \"rhythm description\", \"mnemonic\": \"memorable phrase\", \"description\": \"relation of phrase to rhythm\"}]}. Each mnemonic should assist performers in internalizing the rhythm, be vivid, amusing, easy to remember, and encapsulate the feel or phrasing of the pattern.";
    
    const finalPrompt = prompt || defaultPrompt;

    // Create system message
    let systemMessage = "You are an expert in music notation, particularly for samba percussion. ";
    
    if (wasFileTruncated) {
      systemMessage += "The user will provide a truncated PDF of music notation in base64 format (the PDF was too large and had to be truncated). ";
    } else {
      systemMessage += "The user will provide a PDF of music notation in base64 format. ";
    }
    
    systemMessage += "Your task is to analyze the musical notation, identify rhythm patterns, and generate vocal mnemonics that help musicians remember each pattern. Return your response as JSON with 'analysis' and 'mnemonics' fields.";
    
    // Create user message with the PDF content
    const userMessage = `I'm working with a PDF samba music notation file named "${filename}". Here is the base64-encoded PDF content:${wasFileTruncated ? ' (truncated due to size)' : ''}\n\n${truncatedBase64}\n\nPlease analyze this PDF and ${finalPrompt}`;
    
    // Build request with appropriate parameters
    const messages = [
      { role: "system" as const, content: systemMessage },
      { role: "user" as const, content: userMessage }
    ];
    
    // Create appropriate parameters for the completion
    const completionParams: ChatCompletionParams = {
      model: modelToUse,
      messages: messages,
    };
    
    // Only add parameters supported by the model type
    if (!isClaude) {
      // Non-Claude models (like OpenAI) support temperature and top_p
      completionParams.temperature = params?.temperature ?? 0.7;
      completionParams.top_p = params?.top_p ?? 1;
    }
    
    // Reduce the logging of large content
    const truncatedUserMessage = userMessage.length > 1000 ? 
      userMessage.substring(0, 500) + `... [${userMessage.length - 1000} CHARS TRUNCATED] ...` + userMessage.substring(userMessage.length - 500) : 
      userMessage;
    
    console.log("[Music Sheet Analysis] User message (truncated):", truncatedUserMessage);
    console.log("[Music Sheet Analysis] Model being used:", modelNameStr);
    console.log("[Music Sheet Analysis] Sending API request for PDF analysis");
    
    // Using the generateChatCompletion function instead of direct API call
    const responseText = await generateChatCompletion(completionParams);
    
    console.log("[Music Sheet Analysis] Raw AI response:", responseText.length > 500 ? 
      responseText.substring(0, 250) + `... [${responseText.length - 500} CHARS TRUNCATED] ...` + responseText.substring(responseText.length - 250) : 
      responseText);
    
    // Parse the response
    let result = {
      analysis: responseText,
      mnemonics: []
    };
    
    // Try to extract structured data from the response
    try {
      // Check if response contains JSON
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      let jsonContent = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
      
      // Handle potential JSON within the content
      if (jsonContent.includes('{') && jsonContent.includes('}')) {
        const jsonStartIdx = jsonContent.indexOf('{');
        const jsonEndIdx = jsonContent.lastIndexOf('}') + 1;
        if (jsonStartIdx >= 0 && jsonEndIdx > jsonStartIdx) {
          jsonContent = jsonContent.substring(jsonStartIdx, jsonEndIdx);
        }
      }
      
      // Try parsing if it looks like JSON
      if (jsonContent.startsWith('{') && jsonContent.endsWith('}')) {
        try {
          const parsedJson = JSON.parse(jsonContent);
          
          // Log parsed JSON structure
          console.log("[Music Sheet Analysis] Successfully parsed JSON response:", JSON.stringify({
            keys: Object.keys(parsedJson),
            hasSummary: !!parsedJson.summary,
            hasAnalysis: !!parsedJson.analysis,
            mnemonicsCount: parsedJson.mnemonics?.length || 0
          }));
          
          // Check for the new format (summary + mnemonics with mnemonic field)
          if (parsedJson.summary) {
            result.analysis = parsedJson.summary;
          } else if (parsedJson.analysis) {
            result.analysis = parsedJson.analysis;
          }
          
          if (parsedJson.mnemonics && Array.isArray(parsedJson.mnemonics)) {
            // Convert from either format to our expected format
            result.mnemonics = parsedJson.mnemonics.map((item: any) => ({
              text: item.mnemonic || item.text || '',
              pattern: item.pattern || '',
              description: item.description || ''
            }));
          }
        } catch (e) {
          console.error("[Music Sheet Analysis] Error parsing JSON content:", e);
          // Not valid JSON, keep using the full text as analysis
        }
      }
    } catch (parseError) {
      console.error("[Music Sheet Analysis] Error in JSON extraction process:", parseError);
      // Keep using the full response as the analysis
    }
    
    return result;
  } catch (error) {
    console.error("Error analyzing music sheet PDF:", error);
    throw error;
  }
}
