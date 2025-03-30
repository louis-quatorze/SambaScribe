import { readFile } from 'fs/promises';
import { join } from 'path';
import { generateChatCompletion } from '@/lib/aiClient';

export interface AiNotationData {
  filename: string;
  aiSummary: string;
  mnemonics: string[];
}

export async function aiProcessFile(filename: string): Promise<AiNotationData> {
  try {
    if (!filename || typeof filename !== 'string') {
      throw new Error('Invalid filename provided');
    }

    // Instead of parsing the PDF, we'll just use the filename for context
    const isPdf = filename.toLowerCase().endsWith('.pdf');
    const fileType = isPdf ? 'PDF' : 'text file';
    
    // Generate AI summary based on the file context
    const aiSummary = await generateAISummary(filename, fileType);
    const mnemonics = await generateAIMnemonics(aiSummary);

    return {
      filename,
      aiSummary,
      mnemonics
    };
  } catch (error) {
    console.error('AI processing error:', error);
    throw error instanceof Error ? error : new Error('Failed to process file with AI');
  }
}

async function generateAISummary(filename: string, fileType: string): Promise<string> {
  const prompt = `
    I'm analyzing a ${fileType} named "${filename}" that contains samba notation.
    
    Without actually seeing the content, provide a helpful summary of what samba notation typically includes:
    
    1. Common instruments and their typical patterns
    2. How different sections might be structured
    3. Key elements like tempo markings, breaks, and transitions
    
    Keep your response under 200 words and focus on being educational about samba rhythm notation.
  `;
  
  return await generateChatCompletion([
    { role: "system", content: "You are an expert in samba music notation and rhythm patterns." },
    { role: "user", content: prompt }
  ], "O1");
}

async function generateAIMnemonics(contextSummary: string): Promise<string[]> {
  const prompt = `
    Based on this context about samba notation:
    
    "${contextSummary}"
    
    Create 5 helpful vocal mnemonics that would help a musician remember common samba rhythm patterns.
    A mnemonic is a verbal or spoken pattern that helps remember the rhythm.
    
    For example:
    - For a simple surdo pattern: "BUM-pause-BUM-pause"
    - For a caixa pattern: "chi-chi-chi-CHI-chi-chi-CHI"
    
    Return ONLY a JSON array of strings with 5 different vocal mnemonics for different 
    common samba instruments (surdo, caixa, repinique, tamborim, agogo).
    The response must be a valid JSON array that can be parsed with JSON.parse().
  `;
  
  const response = await generateChatCompletion([
    { role: "system", content: "You are an expert samba percussion teacher who creates helpful vocal mnemonics. Return ONLY valid JSON arrays in your responses." },
    { role: "user", content: prompt }
  ], "O1");
  
  console.log("Raw AI response for mnemonics:", response);
  
  try {
    // Try to extract JSON array if it's wrapped in markdown code blocks
    let jsonStr = response;
    
    // Handle markdown code blocks if present
    if (response.includes("```json")) {
      const match = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        jsonStr = match[1].trim();
      }
    } else if (response.includes("```")) {
      const match = response.match(/```\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        jsonStr = match[1].trim();
      }
    }
    
    // Try to parse as JSON array
    const mnemonics = JSON.parse(jsonStr);
    
    if (Array.isArray(mnemonics)) {
      // Ensure all items are strings
      const validMnemonics = mnemonics
        .filter(item => typeof item === 'string')
        .map(item => item.trim())
        .filter(item => item.length > 0);
      
      if (validMnemonics.length > 0) {
        console.log("Parsed mnemonics as array:", validMnemonics);
        return validMnemonics;
      }
    }
    
    // If not a valid array or empty, provide fallback
    console.warn("AI didn't return a valid array of strings, using fallback mnemonics");
    return [
      "Surdo: BUM - pause - BUM - pause",
      "Caixa: chi-chi-chi-CHI-chi-chi-CHI",
      "Repinique: para-papa-para-papa",
      "Tamborim: chi-ka chi-ka chi-KA-KA",
      "Agogo: TING-ting TING-ting"
    ];
  } catch (e) {
    console.error("Failed to parse mnemonics JSON:", e);
    // Provide fallback mnemonics
    return [
      "Surdo: BUM - pause - BUM - pause",
      "Caixa: chi-chi-chi-CHI-chi-chi-CHI",
      "Repinique: para-papa-para-papa",
      "Tamborim: chi-ka chi-ka chi-KA-KA",
      "Agogo: TING-ting TING-ting"
    ];
  }
} 