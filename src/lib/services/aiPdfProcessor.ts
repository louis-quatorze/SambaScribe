import { readFile } from 'fs/promises';
import { join } from 'path';
import { generateChatCompletion } from '@/lib/aiClient';
import { existsSync } from 'fs';

export interface AiNotationData {
  filename: string;
  aiSummary: string;
  mnemonics: string[];
}

export interface PartialAiNotationData {
  filename: string;
  aiSummary: string;
  mnemonics?: string[];
}

// This is a dynamic import with a try/catch to prevent build errors
const getPdfParser = async () => {
  try {
    return (await import('pdf-parse')).default;
  } catch (error) {
    console.error('Failed to import pdf-parse:', error);
    return null;
  }
};

export async function aiProcessFile(filename: string): Promise<PartialAiNotationData> {
  try {
    if (!filename || typeof filename !== 'string') {
      throw new Error('Invalid filename provided');
    }

    // Read the file path
    const filePath = join(process.cwd(), 'uploads', filename);
    
    // Check if file exists
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Determine file type and read content appropriately
    const isPdf = filename.toLowerCase().endsWith('.pdf');
    const fileType = isPdf ? 'PDF' : 'text file';
    
    let fileContent = '';
    
    // Parse based on file type
    if (isPdf) {
      try {
        const pdfParser = await getPdfParser();
        if (!pdfParser) {
          throw new Error('PDF parser not available');
        }
        
        const dataBuffer = await readFile(filePath);
        const pdfData = await pdfParser(dataBuffer);
        fileContent = pdfData.text || 'No text content extracted from PDF';
        console.log('PDF extraction successful for file:', filename);
      } catch (pdfError) {
        console.error('Error parsing PDF:', pdfError);
        fileContent = `Error extracting content from PDF. Analyzing based on file name: ${filename}`;
      }
    } else {
      // For text files, read directly
      fileContent = await readFile(filePath, 'utf-8');
    }
    
    // Generate AI summary based on the file content
    const aiSummary = await generateAISummary(filename, fileType, fileContent);
    
    // Return just the summary first for immediate display
    // Mnemonics will be generated in a separate API call
    return {
      filename,
      aiSummary
    };
  } catch (error) {
    console.error('AI processing error:', error);
    throw error instanceof Error ? error : new Error('Failed to process file with AI');
  }
}

// Function to generate mnemonics separately
export async function generateMnemonics(filename: string, summary: string): Promise<string[]> {
  try {
    // Get file content for context
    let fileContent = '';
    try {
      const filePath = join(process.cwd(), 'uploads', filename);
      if (existsSync(filePath)) {
        const isPdf = filename.toLowerCase().endsWith('.pdf');
        
        if (isPdf) {
          const pdfParser = await getPdfParser();
          if (pdfParser) {
            const dataBuffer = await readFile(filePath);
            const pdfData = await pdfParser(dataBuffer);
            fileContent = pdfData.text || '';
          }
        } else {
          fileContent = await readFile(filePath, 'utf-8');
        }
      }
    } catch (error) {
      console.error('Error reading file for mnemonics generation:', error);
      // Continue with summary only if file reading fails
    }
    
    return await generateAIMnemonics(summary, fileContent);
  } catch (error) {
    console.error('Mnemonics generation error:', error);
    throw error instanceof Error ? error : new Error('Failed to generate mnemonics');
  }
}

async function generateAISummary(filename: string, fileType: string, fileContent: string): Promise<string> {
  // Create a truncated version of the content if it's too long
  const truncatedContent = fileContent.length > 4000 
    ? fileContent.substring(0, 4000) + "... (content truncated)"
    : fileContent;

  const prompt = `
    I'm analyzing a ${fileType} named "${filename}" that contains samba notation.
    
    Here's the content of the file:
    
    ${truncatedContent}
    
    Please provide a helpful summary of what this samba notation includes:
    
    1. Identify the instruments and their patterns shown in the notation
    2. Describe how different sections are structured
    3. Note any key elements like tempo markings, breaks, and transitions
    
    Keep your response under 200 words and focus on being educational about the specific samba rhythm notation in this file.
  `;
  
  return await generateChatCompletion([
    { role: "system", content: "You are an expert in samba music notation and rhythm patterns." },
    { role: "user", content: prompt }
  ], "O1");
}

async function generateAIMnemonics(contextSummary: string, fileContent: string): Promise<string[]> {
  const prompt = `
    Based on this samba notation content summary:
    
    "${contextSummary}"
    
    And considering the original notation, create 5 helpful vocal mnemonics that would help a musician 
    remember the specific rhythm patterns shown in this notation.
    
    A mnemonic is a verbal or spoken pattern that helps remember the rhythm.
    
    For example:
    - For a simple surdo pattern: "BUM-pause-BUM-pause"
    - For a caixa pattern: "chi-chi-chi-CHI-chi-chi-CHI"
    
    Return ONLY a JSON array of strings with 5 different vocal mnemonics.
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