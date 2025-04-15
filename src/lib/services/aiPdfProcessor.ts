import { readFile } from 'fs/promises';
import { join } from 'path';
import { generateChatCompletion, generateVisionAnalysis } from '@/lib/aiClient';
import { existsSync } from 'fs';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface AiNotationData {
  filename: string;
  aiSummary: string;
  mnemonics: Array<{
    text: string;
    pattern?: string;
    description?: string;
  }>;
}

// Special mnemonics for specific patterns
const specialMnemonics = {
};

// Default section identifiers for samba notation
const DEFAULT_SECTION_IDENTIFIERS = ['Intro', 'Groove', 'Break', 'Outro'];

// All prompt templates and examples for AI calls
const PROMPT_TEMPLATES = {
  // System prompts
  SYSTEM_SUMMARY: "You are an expert in samba music notation and Brazilian percussion with extensive knowledge of rhythm patterns, breaks, and common samba notation conventions.",
  SYSTEM_MNEMONICS: "You are a music educator, specializing in samba percussion. Your task is to create accurate vocal mnemonics that match the rhythm patterns in the notation. These mnemonics should have a one-to-one mapping between syllables and notes.",
  
  // File introduction templates
  FILE_INTRO: (fileType: string, filename: string) => 
    `I have a ${fileType} containing samba music notation with the filename "${filename}"`,
  
  // Summary request templates
  SUMMARY_REQUEST: `
Focus on:
- Musical instruments involved (such as surdo, repinique, caixa, tamborim, agogô, chocalho, etc.)
- Structure and flow of the music
- Time signature and tempo indications
- Key rhythm patterns and their names if identifiable
- Dynamics and performance instructions

Include the following types of information if present:
- Names of specific rhythm patterns or breaks
- Tempo markings
- Dynamic markings (forte, piano, etc.)
- Performance instructions

IMPORTANT: Format key instruments, patterns, or technical terms by wrapping them in double asterisks for emphasis (e.g., **surdo**, **tamborim**, **butterfly break**). This will make important terms stand out in the summary.`,

  // Example patterns for mnemonics
  MNEMONICS_EXAMPLES: `
Here are examples of samba rhythm patterns and effective mnemonics:

"examples": [
  {
    "section_name": "Butterfly Break",
    "rhythmic_pattern": "Quarter note, [Space], Quarter note, [Space], Quarter note, [Space], Eighth note, Eighth note, [Space], Eighth note",
    "expected_result": {
      "text": "Out of the Chry-sa-lis",
      "pattern": "Butterfly Break",
      "description": "A mnemonic with syllables that directly correspond to the rhythm, using the theme of 'butterfly'."
    }
  },
  {
    "section_name": "Ballerina Break",
    "rhythmic_pattern": "Eighth note, Eighth note, Eighth note",
    "expected_result": {     
      "text": "Tchai-ko-vsky",
      "pattern": "Ballerina Break",
      "description": "The three syllables of 'Tchaikovsky' match the three evenly spaced notes. Inspired by classical music, this mnemonic aligns with the theme, as Tchaikovsky is famous for composing ballet masterpieces like Swan Lake and The Nutcracker."    
    }
  }
]`,

  // Base prompt for mnemonics generation
  MNEMONICS_BASE: `
Using the PDF content provided, generate 10 rhythm mnemonics that correspond to specific sections of the notation, following the same order as they appear in the music sheet, focus on breaks.

For each mnemonic, provide:
- Mnemonic text (syllables matching the rhythm)
- Pattern/section name (IMPORTANT: must match EXACTLY theactual section labels from the PDF, such as "Groove," "Agogo Feature," "Break")
- Brief description of the rhythm, less than 10 words.

Guidelines:
- Ensure mnemonics reflect the true rhythmic structure found in the notation.
- Use syllables that are easy to pronounce and remember.
- Consider accents, syncopation, and dynamics.
- Mnemonics should help musicians internalize and recall the rhythm effectively.
- Use only real section names from the PDF (do not invent new ones like "Section 1, Section 2").

Output Format:
Return a JSON array of objects, strictly following this structure array
[
  {
    "text": "the mnemonic syllables",
    "pattern": "the section label from the PDF",
    "description": "brief description of the rhythm"
  }
]

Do not include additional text before or after the JSON output.
Example:
[
  {
    "text": "Out of the Chry-sa-lis",
    "pattern": "Butterfly Break",
    "description": "A mnemonic that aligns syllables with the rhythm, using a butterfly theme."
  },
  {
    "text": "Tchai-ko-vsky",
    "pattern": "Ballerina Break",
    "description": "Matches three evenly spaced notes, inspired by ballet composer Tchaikovsky."
  }
]  
`,

  // Full prompts for different scenarios
  PDF_SUMMARY: (filename: string) => `
${PROMPT_TEMPLATES.FILE_INTRO('PDF', filename)} and encoded in base64.
This file contains actual musical notation that you should analyze.

Based on this file, provide a concise summary (under 100 words) of what this notation contains.

${PROMPT_TEMPLATES.SUMMARY_REQUEST}

IMPORTANT: Include at least 3 specific elements or terms you found in the PDF (such as specific breaks, pattern names, or musical instructions). Put these terms in quotes AND format important terms by wrapping them in double asterisks (e.g., **"surdo"**, **"butterfly break"**) to highlight key terminology.

Keep the summary informative and highlight the most important aspects of the notation for a samba drummer.

`,

  TEXT_SUMMARY: (filename: string, content: string) => `
${PROMPT_TEMPLATES.FILE_INTRO('text file', filename)} and the following content:
      
"${content}}"

Please provide a concise summary (under 100 words) of this notation. 

${PROMPT_TEMPLATES.SUMMARY_REQUEST}

IMPORTANT: Include at least 3-4 specific elements or terms you found in the text. Format important terms by wrapping them in double asterisks (e.g., **surdo**, **butterfly break**) to highlight key terminology.`,

  PDF_MNEMONICS: (content: string) => `
Using the PDF content provided in base64 format (which contains the actual notation),
create 10 vocal mnemonics (syllables or words) that match the rhythm patterns in the PDF.
Look for patterns in the notation and create mnemonics that follow these rhythms.

${PROMPT_TEMPLATES.MNEMONICS_BASE}

${PROMPT_TEMPLATES.MNEMONICS_EXAMPLES}

PDF base64 content: ${content}`,

  TEXT_MNEMONICS: (summary: string, content: string) => `
Based on this summary: "${summary}" 
      
And this samba notation content:
"${content}"

Create 20 vocal mnemonics (syllables or words) that match the rhythm patterns in this notation.
Consider the primary accents, syncopations, and any special patterns described.

${PROMPT_TEMPLATES.MNEMONICS_BASE}

${PROMPT_TEMPLATES.MNEMONICS_EXAMPLES}`
};

// Fallback mnemonics when AI generation fails
const FALLBACK_MNEMONICS = [
  { text: "DUM ka DUM ka", pattern: "Basic Pattern", description: "even quarter notes" }
];

/**
 * Convert markdown-style bold formatting to HTML bold tags
 * Replaces **text** with <b>text</b>
 */
function formatSummaryAsHtml(summary: string): string {
  if (!summary) return '';
  
  // If the text already contains proper HTML tags, return it as is
  if (summary.includes('<b>') && !summary.includes('**')) {
    return summary;
  }
  
  // If the text contains escaped HTML entities, unescape them first
  const unescapedSummary = summary
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  
  // Replace **text** with <b>text</b>
  // The regex matches ** followed by any characters (non-greedy) until the next **
  return unescapedSummary.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
}

export async function aiProcessFile(filename: string): Promise<AiNotationData> {
  try {
    if (!filename || typeof filename !== 'string') {
      throw new Error('Invalid filename provided');
    }

    // Log S3 configuration
    console.log('S3 Configuration:', {
      region: process.env.AWS_REGION,
      bucket: process.env.BUCKET_NAME,
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
    });

    const s3Key = `samples/${filename}`;
    console.log('Attempting to fetch S3 file:', {
      bucket: process.env.BUCKET_NAME,
      key: s3Key,
      expectedUrl: `https://${process.env.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`
    });

    // Get the file from S3
    const command = new GetObjectCommand({
      Bucket: process.env.BUCKET_NAME!,
      Key: s3Key,
    });

    const response = await s3.send(command);
    
    if (!response.Body) {
      throw new Error(`File not found: samples/${filename}`);
    }

    // Convert the readable stream to a buffer
    const chunks = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    // Determine file type
    const isPdf = filename.toLowerCase().endsWith('.pdf');
    const fileType = isPdf ? 'PDF' : 'text file';
    
    let fileContent = '';
    let pdfBase64 = '';
    
    if (isPdf) {
      // For PDFs, convert to base64
      pdfBase64 = buffer.toString('base64');
      fileContent = `PDF file: ${filename} (binary content)`;
      console.log(`PDF file read successfully: ${filename}, size: ${pdfBase64.length} characters (base64)`);
    } else {
      // For text files, convert to UTF-8
      fileContent = buffer.toString('utf-8');
      console.log(`Text file read successfully: ${filename}, size: ${fileContent.length} characters`);
    }
    
    // Generate AI summary based on the file content
    let aiSummary = await generateAISummary(
      filename, 
      fileType, 
      isPdf ? pdfBase64 : fileContent, 
      isPdf
    );
    
    // Format the summary to convert markdown bold to HTML bold
    aiSummary = formatSummaryAsHtml(aiSummary);
    
    // Define pattern detectors with proper typing
    const patternDetectors: Record<string, string[]> = {
      // Add your pattern detectors here if needed
    };

    // Check for each pattern
    const detectedPatterns: Record<string, boolean> = {};
    
    // Function to check if content includes any of the terms
    const contentIncludesAny = (terms: string[], content: string | undefined): boolean => {
      if (!content) return false;
      const lowerContent = content.toLowerCase();
      return terms.some(term => lowerContent.includes(term.toLowerCase()));
    };
    
    // Detect patterns in filename, content and summary
    for (const [pattern, terms] of Object.entries(patternDetectors)) {
      detectedPatterns[pattern] = (
        contentIncludesAny(terms, filename) || 
        contentIncludesAny(terms, fileContent) || 
        contentIncludesAny(terms, aiSummary)
      );
    }
    
    // Generate mnemonics
    let mnemonics = await generateAIMnemonics(
      aiSummary, 
      isPdf ? pdfBase64 : fileContent, 
      isPdf
    );
    
    // Add special mnemonics for detected patterns
    for (const [pattern, detected] of Object.entries(detectedPatterns)) {
      if (detected && pattern in specialMnemonics) {
        console.log(`${pattern} pattern detected, adding special mnemonic`);
        
        // Add the special mnemonic at the beginning and filter out any duplicates
        mnemonics = [
          specialMnemonics[pattern as keyof typeof specialMnemonics],
          ...mnemonics.filter(m => !m.text.toLowerCase().includes(pattern.toLowerCase()))
        ];
      }
    }

    return {
      filename,
      aiSummary,
      mnemonics
    };
  } catch (error) {
    console.error('AI processing error:', error);
    // Instead of throwing, return a fallback response with error information
    return {
      filename: filename || 'unknown-file',
      aiSummary: `Unable to analyze file. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      mnemonics: FALLBACK_MNEMONICS
    };
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
      console.log(`Sending PDF for analysis: ${filename}, content length: ${content.length} chars`);
      
      if (!content || content.length < 100) {
        console.warn("PDF content appears invalid or too small");
        return `Could not extract valid content from ${filename}. The file may be corrupted or empty.`;
      }
      
      const textPrompt = PROMPT_TEMPLATES.PDF_SUMMARY(filename);

      console.log('\n=== SUMMARY PROMPT ===\n');
      console.log('System:', PROMPT_TEMPLATES.SYSTEM_SUMMARY);
      console.log('\nUser:', textPrompt);
      console.log('\n===================\n');

      const result = await generateChatCompletion({
        model: 'GPT_4O_MINI',
        messages: [
          { role: "system", content: PROMPT_TEMPLATES.SYSTEM_SUMMARY },
          { role: "user", content: `${textPrompt}\n\nBase64 PDF content: ${content}` }
        ]
      });
      console.log('PDF content-based summary generated successfully');
      return result.trim();
    } else {
      const prompt = PROMPT_TEMPLATES.TEXT_SUMMARY(filename, content);

      console.log('\n=== SUMMARY PROMPT (TEXT) ===\n');
      console.log('System:', PROMPT_TEMPLATES.SYSTEM_SUMMARY);
      console.log('\nUser:', prompt);
      console.log('\n===================\n');

      const result = await generateChatCompletion({
        model: 'GPT_4O_MINI',
        messages: [
          { role: "system", content: PROMPT_TEMPLATES.SYSTEM_SUMMARY },
          { role: "user", content: prompt }
        ]
      });
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
  isPdf: boolean,
  sectionIdentifiers: string[] = DEFAULT_SECTION_IDENTIFIERS
): Promise<Array<{ text: string; pattern?: string; description?: string }>> {
  try {
    let response: string;
    
    if (isPdf) {
      const pdfPrompt = PROMPT_TEMPLATES.PDF_MNEMONICS(content);

      console.log('\n=== MNEMONICS PROMPT (PDF) ===\n');
      console.log('System:', PROMPT_TEMPLATES.SYSTEM_MNEMONICS);
      console.log('\nUser:', pdfPrompt.replace(/PDF base64 content.*$/, 'PDF base64 content: [CONTENT_OMITTED]'));
      console.log('\n===================\n');

      response = await generateChatCompletion({
        model: 'GPT_4O_MINI',
        messages: [
          { role: "system", content: PROMPT_TEMPLATES.SYSTEM_MNEMONICS },
          { role: "user", content: pdfPrompt }
        ]
      });
      
      console.log('Generated mnemonics using PDF content');
    } else {
      const prompt = PROMPT_TEMPLATES.TEXT_MNEMONICS(summary, content);

      console.log('\n=== MNEMONICS PROMPT (TEXT) ===\n');
      console.log('System:', PROMPT_TEMPLATES.SYSTEM_MNEMONICS);
      console.log('\nUser:', prompt);
      console.log('\n===================\n');

      response = await generateChatCompletion({
        model: 'GPT_4O_MINI',
        messages: [
          { role: "system", content: PROMPT_TEMPLATES.SYSTEM_MNEMONICS },
          { role: "user", content: prompt }
        ]
      });
    }
    
    // Process the response
    console.log('Raw AI mnemonics response:', response);
    
    // Check for common error messages
    if (response.includes("Unable to analyze this PDF")) {
      console.warn('Vision API could not analyze the PDF, using fallback mnemonics');
      return FALLBACK_MNEMONICS;
    }
    
    // Try to extract a JSON array
    try {
      // First, try to extract JSON from code fence if present
      let jsonContent = response;
      const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonContent = codeBlockMatch[1].trim();
        console.log('Extracted JSON content from code fence:', jsonContent);
      }

      // Try to parse the JSON content
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(jsonContent);
      } catch (e) {
        // If parsing fails, try to find a JSON array in the response
        const jsonMatch = response.match(/\[\s*\{[^}]*\}(?:\s*,\s*\{[^}]*\})*\s*\]/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } else {
          throw e;
        }
      }

      if (Array.isArray(parsedResponse) && parsedResponse.length > 0) {
        console.log('Extracted mnemonics:', parsedResponse);
        // Convert the response to our expected format
        return parsedResponse.slice(0, 5).map(item => ({
          text: item.text,
          pattern: item.pattern || item.section,
          description: item.description
        }));
      }
    } catch (parseError) {
      console.warn('Failed to parse mnemonics JSON:', parseError);
    }
    
    // Fallback mnemonics if we couldn't parse any
    console.warn('Using fallback mnemonics');
    return FALLBACK_MNEMONICS.map((mnemonic, index) => ({
      ...mnemonic,
      pattern: sectionIdentifiers[index % sectionIdentifiers.length]
    }));
  } catch (error) {
    console.error('AI mnemonics generation error:', error);
    return FALLBACK_MNEMONICS.map((mnemonic, index) => ({
      ...mnemonic,
      pattern: sectionIdentifiers[index % sectionIdentifiers.length]
    }));
  }
} 