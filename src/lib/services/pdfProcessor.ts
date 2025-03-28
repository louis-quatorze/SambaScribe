import { readFile } from 'fs/promises';
import { join } from 'path';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

export interface NotationData {
  text: string;
  patterns: string[];
  instruments: string[];
  breaks: string[];
}

export async function processPdfFile(filename: string): Promise<NotationData> {
  try {
    const filePath = join(process.cwd(), 'uploads', filename);
    
    // Check if file exists
    try {
      await readFile(filePath);
    } catch (error) {
      throw new Error(`File not found: ${filename}`);
    }

    const fileBuffer = await readFile(filePath);
    
    // Convert Buffer to Uint8Array
    const uint8Array = new Uint8Array(fileBuffer);
    
    // Load the PDF document
    try {
      const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
      const pdf = await loadingTask.promise;
      
      // Extract text from all pages
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }

      // Basic pattern recognition for Samba notation
      // This is a simple implementation that can be enhanced
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
      throw new Error(`Failed to process PDF content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error processing PDF:', error);
    throw error instanceof Error ? error : new Error('Failed to process PDF file');
  }
}

function extractPatterns(text: string): string[] {
  // Look for common Samba rhythm patterns
  const patternRegex = /[xXoO-]+/g;
  return text.match(patternRegex) || [];
}

function extractInstruments(text: string): string[] {
  // Common Samba instruments
  const commonInstruments = [
    'surdo', 'caixa', 'repinique', 'tamborim',
    'agogo', 'cuica', 'ganza', 'chocalho'
  ];
  
  return commonInstruments.filter(instrument => 
    text.toLowerCase().includes(instrument)
  );
}

function extractBreaks(text: string): string[] {
  // Look for common break indicators
  const breakRegex = /break|parada|stop|solo/i;
  const lines = text.split('\n');
  
  return lines
    .filter(line => breakRegex.test(line))
    .map(line => line.trim());
} 