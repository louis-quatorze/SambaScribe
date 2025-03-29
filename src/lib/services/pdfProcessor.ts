import { readFile } from 'fs/promises';
import { join } from 'path';
import { getDocument, version } from 'pdfjs-dist';

export interface NotationData {
  text: string;
  patterns: string[];
  instruments: string[];
  breaks: string[];
}

export async function processPdfFile(filename: string): Promise<NotationData> {
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
    console.error('PDF processing error:', error);
    throw error instanceof Error ? error : new Error('Failed to process PDF file');
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