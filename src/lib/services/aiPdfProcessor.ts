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
    
    Return a JSON-compatible array of strings with 5 different vocal mnemonics for different 
    common samba instruments (surdo, caixa, repinique, tamborim, agogo).
  `;
  
  const response = await generateChatCompletion([
    { role: "system", content: "You are an expert samba percussion teacher who creates helpful vocal mnemonics." },
    { role: "user", content: prompt }
  ], "O1");
  
  try {
    // Try to parse as JSON array
    const mnemonics = JSON.parse(response);
    if (Array.isArray(mnemonics)) {
      return mnemonics;
    }
    
    // If not an array but we got something, wrap it
    return [response];
  } catch (e) {
    // If parsing fails, just return as a single string
    return [response];
  }
} 