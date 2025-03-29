import { readFile } from 'fs/promises';
import { join } from 'path';

export interface NotationData {
  text: string;
  patterns: string[];
  instruments: string[];
  breaks: string[];
}

export async function processTextFile(filename: string): Promise<NotationData> {
  try {
    if (!filename || typeof filename !== 'string') {
      throw new Error('Invalid filename provided');
    }

    const filePath = join(process.cwd(), 'uploads', filename);
    const fileContent = await readFile(filePath, 'utf-8');
    const fullText = fileContent;

    // Extract patterns and other data
    const patterns = extractPatterns(fullText);
    const instruments = extractInstruments(fullText);
    const breaks = extractBreaks(fullText);

    return {
      text: fullText,
      patterns,
      instruments,
      breaks
    };
  } catch (error) {
    console.error('Text processing error:', error);
    throw error instanceof Error ? error : new Error('Failed to process text file');
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