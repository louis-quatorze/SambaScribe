import { readFile } from 'fs/promises';
import { join } from 'path';
import { generateChatCompletion, generateVisionAnalysis } from '@/lib/aiClient';
import { existsSync } from 'fs';

export interface AiNotationData {
  filename: string;
  aiSummary: string;
  mnemonics: string[];
}

// Special mnemonics for specific patterns
const specialMnemonics = {
  'butterfly': 'Butterfly Break: "Out of the Chrysalis" (1-2 - 3-triplet-6)'
};

export async function aiProcessFile(filename: string): Promise<AiNotationData> {
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
    
    // Determine file type
    const isPdf = filename.toLowerCase().endsWith('.pdf');
    const fileType = isPdf ? 'PDF' : 'text file';
    
    let fileContent = '';
    let pdfBase64 = '';
    
    // Read the file differently based on type
    if (isPdf) {
      // For PDFs, read as binary and convert to base64
      const dataBuffer = await readFile(filePath);
      pdfBase64 = dataBuffer.toString('base64');
      fileContent = `PDF file: ${filename} (binary content)`;
      console.log(`PDF file read successfully: ${filename}, size: ${pdfBase64.length} characters (base64)`);
    } else {
      // For text files, read as UTF-8
      fileContent = await readFile(filePath, 'utf-8');
      console.log(`Text file read successfully: ${filename}, size: ${fileContent.length} characters`);
    }
    
    // Generate AI summary based on the file content
    const aiSummary = await generateAISummary(
      filename, 
      fileType, 
      isPdf ? pdfBase64 : fileContent, 
      isPdf
    );
    
    // For detecting butterfly patterns, check if the summary includes it
    const hasButterfly = 
      filename.toLowerCase().includes('butterfly') || 
      fileContent.toLowerCase().includes('butterfly') ||
      aiSummary.toLowerCase().includes('butterfly');
    
    // Generate mnemonics
    let mnemonics = await generateAIMnemonics(
      aiSummary, 
      isPdf ? pdfBase64 : fileContent, 
      isPdf
    );
    
    // Add the special butterfly mnemonic if detected
    if (hasButterfly) {
      console.log('Butterfly break pattern detected, adding special mnemonic');
      mnemonics = [
        specialMnemonics.butterfly,
        ...mnemonics.filter(m => !m.toLowerCase().includes('butterfly'))
      ];
    }

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

async function generateAISummary(
  filename: string, 
  fileType: string, 
  content: string, 
  isPdf: boolean
): Promise<string> {
  try {
    if (isPdf) {
      // For PDFs, use the vision API
      const visionPrompt = `Analyze this samba music notation PDF and provide a concise summary (under 50 words).
Focus on:
- Musical instruments involved
- Overall structure and flow
- Key elements like tempo, breaks, and unique patterns
- Identify if there's a "butterfly break" pattern

Keep the summary concise but informative.`;

      const result = await generateVisionAnalysis(filename, content, visionPrompt);
      console.log('Vision analysis summary generated successfully');
      return result.trim();
    } else {
      // For text content, use the regular chat API
      const prompt = `I have a ${fileType} containing samba music notation with the filename "${filename}" and the following content:
      
"${content.substring(0, 1500)}${content.length > 1500 ? '...' : ''}"

Please provide a concise summary (under 50 words) of this notation. Focus on the key aspects like instruments, structure, and any special patterns.`;

      const result = await generateChatCompletion([
        { role: "system", content: "You are an expert in samba music notation and rhythm patterns." },
        { role: "user", content: prompt }
      ], 'O1');
      console.log('AI summary generated successfully');
      return result.trim();
    }
  } catch (error) {
    console.error('Failed to generate AI summary:', error);
    return `Failed to generate summary for ${filename}. ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Generate mnemonics based on AI analysis of content
 */
async function generateAIMnemonics(
  summary: string, 
  content: string, 
  isPdf: boolean
): Promise<string[]> {
  try {
    let response: string;
    
    if (isPdf) {
      // For PDFs, use vision analysis
      const visionPrompt = `Based on this samba notation PDF and this context summary: "${summary}"
      
Create 5 vocal mnemonics (syllables like "DUM KA PA") that match the rhythm patterns shown in this notation.
Think about the primary accents, syncopations, and any butterfly break patterns.

IMPORTANT: Return ONLY a valid JSON array of strings with your 5 best mnemonics.
Example: ["DUM ka DUM ka", "BOOM chk BOOM chk", ...]`;

      try {
        response = await generateVisionAnalysis('mnemonics', content, visionPrompt);
      } catch (visionError) {
        console.error('Vision analysis error for mnemonics:', visionError);
        // If vision analysis fails, use the summary to generate mnemonics as fallback
        const fallbackPrompt = `Based on this summary of a samba rhythm pattern: "${summary}"
        
Create 5 vocal mnemonics (syllables like "DUM KA PA") that match the described rhythm patterns.
Think about primary accents and syncopations mentioned in the summary.

IMPORTANT: Return ONLY a valid JSON array of strings with your 5 best mnemonics.
Example: ["DUM ka DUM ka", "BOOM chk BOOM chk", ...]`;

        response = await generateChatCompletion([
          { role: "system", content: "You are an expert in creating vocal mnemonics for samba rhythm patterns." },
          { role: "user", content: fallbackPrompt }
        ], 'O1');
      }
    } else {
      // For text content
      const prompt = `Based on this summary: "${summary}" 
      
And this samba notation content:
"${content.substring(0, 1000)}${content.length > 1000 ? '...' : ''}"

Create 5 vocal mnemonics (syllables that match rhythm patterns) for this notation.
Consider the primary accents, syncopations, and any butterfly break patterns.

IMPORTANT: Return ONLY a valid JSON array of strings with your 5 best mnemonics.
Example: ["DUM ka DUM ka", "BOOM chk BOOM chk", ...]`;

      response = await generateChatCompletion([
        { role: "system", content: "You are an expert in creating vocal mnemonics for samba rhythm patterns." },
        { role: "user", content: prompt }
      ], 'O1');
    }
    
    // Process the response
    console.log('Raw AI mnemonics response:', response);
    
    // Check for common error messages
    if (response.includes("Unable to analyze this PDF")) {
      console.warn('Vision API could not analyze the PDF, using fallback mnemonics');
      return [
        "DUM ka DUM ka",
        "BOOM chk BOOM chk",
        "DUM DUM PA pa",
        "TA ki TA ki TA",
        "BOOM pa BOOM pa"
      ];
    }
    
    // Try to extract a JSON array
    try {
      // Find anything that looks like a JSON array
      const jsonMatch = response.match(/\[\s*"[^"]*"(?:\s*,\s*"[^"]*")*\s*\]/);
      if (jsonMatch) {
        const mnemonics = JSON.parse(jsonMatch[0]);
        if (Array.isArray(mnemonics) && mnemonics.length > 0) {
          console.log('Extracted mnemonics:', mnemonics);
          return mnemonics.slice(0, 5);
        }
      }
      
      // If we can't find a proper JSON array but can extract strings, build an array
      const stringMatches = response.match(/"([^"]*)"/g);
      if (stringMatches && stringMatches.length > 0) {
        const mnemonics = stringMatches
          .map(match => match.replace(/"/g, ''))
          .filter(Boolean);
        
        if (mnemonics.length > 0) {
          console.log('Extracted mnemonics from strings:', mnemonics);
          return mnemonics.slice(0, 5);
        }
      }
    } catch (parseError) {
      console.warn('Failed to parse mnemonics JSON:', parseError);
    }
    
    // Fallback mnemonics if we couldn't parse any
    console.warn('Using fallback mnemonics');
    return [
      "DUM ka DUM ka",
      "BOOM chk BOOM chk",
      "DUM DUM PA pa",
      "TA ki TA ki TA",
      "BOOM pa BOOM pa"
    ];
  } catch (error) {
    console.error('Failed to generate mnemonics:', error);
    return [
      "DUM ka DUM ka",
      "BOOM chk BOOM chk", 
      "DUM DUM PA pa",
      "TA ki TA ki TA",
      "BOOM pa BOOM pa"
    ];
  }
} 