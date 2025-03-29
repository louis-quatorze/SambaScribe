import { readFile } from 'fs/promises';
import { join } from 'path';
import { getDocument } from 'pdfjs-dist';
import { generateChatCompletion } from '@/lib/aiClient';

export interface AiNotationData {
  text: string;
  aiSummary: string;
  patterns: string[];
  instruments: string[];
  breaks: string[];
  mnemonics: string[];
}

export async function aiProcessPdfFile(filename: string): Promise<AiNotationData> {
  try {
    if (!filename || typeof filename !== 'string') {
      throw new Error('Invalid filename provided');
    }

    const filePath = join(process.cwd(), 'uploads', filename);
    const fileBuffer = await readFile(filePath);
    
    // Convert Buffer to Uint8Array
    const uint8Array = new Uint8Array(fileBuffer);

    // Configure PDF.js for server-side processing
    const loadingTask = getDocument({
      data: uint8Array,
      useSystemFonts: true,
      disableFontFace: true,
      verbosity: 0,
      isEvalSupported: false,
      useWorkerFetch: false
    });

    const pdf = await loadingTask.promise;
    let fullText = '';

    // Extract text from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    // Extract basic patterns with regex
    const patterns = extractPatterns(fullText);
    const instruments = extractInstruments(fullText);
    const breaks = extractBreaks(fullText);

    // Use AI to analyze the PDF content and generate mnemonics
    const aiSummary = await generateAISummary(fullText);
    const mnemonics = await generateAIMnemonics(fullText, patterns, instruments);

    return {
      text: fullText,
      aiSummary,
      patterns,
      instruments,
      breaks,
      mnemonics
    };
  } catch (error) {
    console.error('AI PDF processing error:', error);
    throw error instanceof Error ? error : new Error('Failed to process PDF file with AI');
  }
}

function extractPatterns(text: string): string[] {
  const patternRegex = /[xXoO-]+/g;
  return text.match(patternRegex) || [];
}

function extractInstruments(text: string): string[] {
  const commonInstruments = [
    'surdo', 'caixa', 'repinique', 'tamborim',
    'agogo', 'cuica', 'ganza', 'chocalho'
  ];
  
  return commonInstruments.filter(instrument => 
    text.toLowerCase().includes(instrument)
  );
}

function extractBreaks(text: string): string[] {
  const breakRegex = /break|parada|stop|solo/i;
  const lines = text.split('\n');
  
  return lines
    .filter(line => breakRegex.test(line))
    .map(line => line.trim());
}

async function generateAISummary(text: string): Promise<string> {
  const prompt = `
    Analyze this samba notation text extracted from a PDF:
    
    "${text.substring(0, 4000)}"
    
    Please provide a concise summary of the samba rhythm described in this notation.
    Focus on identifying the main rhythm pattern, instruments used, and any notable 
    breaks or variations. Keep your response under 200 words.
  `;
  
  return await generateChatCompletion([
    { role: "system", content: "You are an expert in samba music notation and rhythm patterns." },
    { role: "user", content: prompt }
  ], "O1");
}

async function generateAIMnemonics(text: string, patterns: string[], instruments: string[]): Promise<string[]> {
  // Prepare data for AI
  const patternsText = patterns.slice(0, 10).join('\n');
  const instrumentsText = instruments.join(', ');
  
  const prompt = `
    Create helpful mnemonics for the following samba notation patterns. A mnemonic 
    is a verbal or spoken pattern that helps remember the rhythm.
    
    Original text from PDF:
    "${text.substring(0, 2000)}"
    
    Patterns detected:
    ${patternsText}
    
    Instruments mentioned:
    ${instrumentsText}
    
    For each pattern, create a vocal mnemonic that would help a musician remember the 
    rhythm when spoken or sung. Use syllables that match the pattern's rhythm (like "boom", "tak", 
    "chi", etc.) Return a JSON-compatible array of strings with one mnemonic per pattern.
    
    Example: If the pattern is "x-x-o-o-", a mnemonic might be "BUM-ka-BUM-ka-CHEE-ka-CHEE-ka".
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