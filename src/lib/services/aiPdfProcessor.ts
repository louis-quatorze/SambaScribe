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
  'butterfly': 'Butterfly Break: "Out of the Chrysalis" (1-2 - 3-triplet-6)',
  'ballerina': 'Ballerina Break: "Tchai-ko-vsky" (three even beats)',
  'entrada': 'Entrada: "LET-me-IN-to-the-PAR-ty" (entrance pattern)',
  'paradiddle': 'Paradiddle: "pa-ra-di-dle pa-ra-di-dle" (alternating hands)',
  'surdo1': 'Surdo 1: "BOOM --- BOOM ---" (strong beats on 1 and 3)',
  'surdo2': 'Surdo 2: "--- BOOM --- BOOM" (strong beats on 2 and 4)',
  'caixa': 'Caixa: "ta-ka ta-ka-ta ta-ka ta-ka-ta" (sixteenth note pattern)',
  'repinique': 'Repinique: "din-din-din DOOM KA" (call pattern)',
  'tamborim': 'Tamborim: "TIC-a-tic-a-TIC-a-tic-a" (teleco-teco pattern)'
};

// Common prompt templates for AI calls
const PROMPT_TEMPLATES = {
  // System prompts
  SYSTEM_SUMMARY: "You are an expert in samba music notation and Brazilian percussion with extensive knowledge of rhythm patterns, breaks, and common samba notation conventions.",
  SYSTEM_MNEMONICS: "You are a music educator, helping to create rhythmic mnemonics for specific musical patterns. You have deep knowledge of percussion notation and Brazilian rhythmic traditions, and excel at creating mnemonics with a one-to-one mapping between notes and syllables.",
  
  // File introduction templates
  FILE_INTRO: (fileType: string, filename: string) => 
    `I have a ${fileType} containing samba music notation with the filename "${filename}"`,
  
  // Summary request templates
  SUMMARY_REQUEST: `
Focus on:
- Musical instruments involved (such as surdo, repinique, caixa, tamborim, agogô, chocalho, etc.)
- Structure and flow of the music (intro, main pattern, breaks, variations)
- Time signature and tempo indications
- Key rhythm patterns and their names if identifiable
- Dynamics and performance instructions
- Any special breaks or patterns (like butterfly break, ballerina break, entrada, paradiddle)

Include the following types of information if present:
- Names of specific rhythm patterns or breaks
- Tempo markings
- Dynamic markings (forte, piano, etc.)
- Performance instructions
- Section labels (A, B, intro, coda, etc.)

IMPORTANT: Format key instruments, patterns, or technical terms by wrapping them in double asterisks for emphasis (e.g., **surdo**, **tamborim**, **butterfly break**). This will make important terms stand out in the summary.`,

  // Mnemonics examples
  MNEMONICS_EXAMPLES: `
Here are examples of common samba rhythm patterns and effective mnemonics:

"examples": [
  {
    "break_name": "Butterfly Break",
    "rhythmic_pattern": "Quarter note, [Space], Quarter note, [Space], Quarter note, [Space], Eighth note, Eighth note, [Space], Eighth note",
    "expected_result": {
      "mnemonic": "Out of the Chry-sa-lis",
      "explanation": "A mnemonic with syllables that directly correspond to the rhythm, using the theme of 'butterfly'."
    }
  },
  {
    "break_name": "Ballerina Break",
    "rhythmic_pattern": "Eighth note, Eighth note, Eighth note",
    "expected_result": {
      "mnemonic": "Tchai-ko-vsky",
      "explanation": "The three syllables of 'Tchaikovsky' match the three evenly spaced notes. Inspired by classical music, this mnemonic aligns with the theme, as Tchaikovsky is famous for composing ballet masterpieces like Swan Lake and The Nutcracker."
    }
  }
]

Example 3: Entrada (Entrance pattern)
♩ ♪ ♪ ♩ ♪ ♪ ♩ ♩
Notation: Quarter note, two eighth notes, repeated, then two quarter notes
Mnemonic: "LET-me-IN-to-the-PAR-ty"
Captures the entrance rhythm with appropriate emphasis.

Example 4: Paradiddle (Alternating hands pattern)
♪ ♪ ♪ ♪ ♪ ♪ ♪ ♪
Notation: Eight even eighth notes with alternating accents
Mnemonic: "pa-ra-di-dle pa-ra-di-dle"
Traditional drum rudiment vocalization that matches the alternating pattern.

Example 5: Samba Basic Pattern
♩ ♪♬ ♩ ♪♬
Notation: Quarter note followed by triplet, repeated
Mnemonic: "BOOM da-ga BOOM da-ga"
The heavier "BOOM" syllable represents the strong beat, while "da-ga" captures the triplet feel.`,

  // Mnemonics instructions
  MNEMONICS_INSTRUCTIONS: `
IMPORTANT INSTRUCTIONS:
1. Create mnemonics that accurately reflect the rhythm pattern in the notation
2. Use syllables that are easy to pronounce and remember
3. Consider the accents and dynamics of the pattern
4. Include some contextual meaning if possible (like "Tchaikovsky" for ballet-related patterns)
5. Make sure your mnemonics help musicians remember and internalize the rhythms
6. You MUST return ONLY a valid JSON array of strings with your 5 best mnemonics
7. Do not include any additional text before or after the JSON array

Example response format:
["DUM ka DUM ka", "BOOM chk BOOM chk", "TA-ki-TA-ki", "SUR-do-RE-pi-QUE", "TUM tiki TUM tiki"]`
};

// Fallback mnemonics when AI generation fails
const FALLBACK_MNEMONICS = [
  "DUM ka DUM ka",
  "BOOM chk BOOM chk",
  "DUM DUM PA pa",
  "TA ki TA ki TA",
  "BOOM pa BOOM pa"
];

/**
 * Convert markdown-style bold formatting to HTML bold tags
 * Replaces **text** with <b>text</b>
 */
function formatSummaryAsHtml(summary: string): string {
  if (!summary) return '';
  
  // Replace **text** with <b>text</b>
  // The regex matches ** followed by any characters (non-greedy) until the next **
  const formattedSummary = summary.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  
  // Handle case where text is already in HTML format (don't double-convert)
  if (summary.includes('<b>') && !summary.includes('**')) {
    return summary;
  }
  
  return formattedSummary;
}

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
    let aiSummary = await generateAISummary(
      filename, 
      fileType, 
      isPdf ? pdfBase64 : fileContent, 
      isPdf
    );
    
    // Format the summary to convert markdown bold to HTML bold
    aiSummary = formatSummaryAsHtml(aiSummary);
    
    // Pattern detection - check for pattern names in filename, content and AI summary
    const patternDetectors = {
      'butterfly': [
        'butterfly', 'chrysalis', 'flutter'
      ],
      'ballerina': [
        'ballerina', 'ballet', 'tchaikovsky', 'dance', 'tchaikovsk'
      ],
      'entrada': [
        'entrada', 'entrance', 'intro', 'introduction', 'let me in'
      ],
      'paradiddle': [
        'paradiddle', 'alternating hands', 'rudiment', 'alternating sticking'
      ],
      'surdo1': [
        'surdo 1', 'surdo one', 'first surdo', 'marcação', 'marcacao', 'marked beat'
      ],
      'surdo2': [
        'surdo 2', 'surdo two', 'second surdo', 'resposta', 'response beat'
      ],
      'caixa': [
        'caixa', 'snare', 'tarol', 'guerra'
      ],
      'repinique': [
        'repinique', 'repique', 'repis', 'rep'
      ],
      'tamborim': [
        'tamborim', 'teleco-teco', 'teleco', 'carreteiro'
      ]
    };
    
    // Check for each pattern
    const detectedPatterns: Record<string, boolean> = {};
    
    // Function to check if content includes any of the terms
    const contentIncludesAny = (terms: string[], content: string): boolean => {
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
          ...mnemonics.filter(m => !m.toLowerCase().includes(pattern.toLowerCase()))
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
      // For PDFs, send the base64 content for analysis
      console.log(`Sending PDF for analysis: ${filename}, content length: ${content.length} chars`);
      
      // Check if the content is likely a valid base64 PDF
      if (!content || content.length < 100) {
        console.warn("PDF content appears invalid or too small");
        return `Could not extract valid content from ${filename}. The file may be corrupted or empty.`;
      }
      
      const fileIntro = PROMPT_TEMPLATES.FILE_INTRO('PDF', filename);
      const textPrompt = `${fileIntro} and encoded in base64.
This file contains actual musical notation that you should analyze.
Based on this file, provide a concise summary (under 100 words) of what this notation contains.

${PROMPT_TEMPLATES.SUMMARY_REQUEST}

IMPORTANT: Include at least 3-4 specific elements or terms you found in the PDF (such as specific breaks, pattern names, or musical instructions). Put these terms in quotes AND format important terms by wrapping them in double asterisks (e.g., **"surdo"**, **"butterfly break"**) to highlight key terminology.

Keep the summary informative and highlight the most important aspects of the notation for a samba drummer.`;

      const result = await generateChatCompletion([
        { role: "system", content: PROMPT_TEMPLATES.SYSTEM_SUMMARY },
        { role: "user", content: `${textPrompt}\n\nBase64 PDF content: ${content.substring(0, 50000)}${content.length > 50000 ? '...' : ''}` }
      ], 'GPT_4O_MINI');
      console.log('PDF content-based summary generated successfully');
      return result.trim();
    } else {
      // For text content, use the regular chat API
      const fileIntro = PROMPT_TEMPLATES.FILE_INTRO(fileType, filename);
      const prompt = `${fileIntro} and the following content:
      
"${content.substring(0, 1500)}${content.length > 1500 ? '...' : ''}"

Please provide a concise summary (under 100 words) of this notation. 

${PROMPT_TEMPLATES.SUMMARY_REQUEST}

IMPORTANT: Include at least 3-4 specific elements or terms you found in the text. Format important terms by wrapping them in double asterisks (e.g., **surdo**, **butterfly break**) to highlight key terminology.`;

      const result = await generateChatCompletion([
        { role: "system", content: PROMPT_TEMPLATES.SYSTEM_SUMMARY },
        { role: "user", content: prompt }
      ], 'GPT_4O_MINI');
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
    const mnemonicsPromptBase = `
You are to act as a music educator, helping to create rhythmic mnemonics for specific musical patterns. I will provide you with a file containing standard musical notation. This includes time signatures, rhythmic figures, and performance directions. The mnemonic should have a one-to-one mapping between the notes and the syllables of the mnemonic, using the same theme as the break name.

${PROMPT_TEMPLATES.MNEMONICS_EXAMPLES}

${PROMPT_TEMPLATES.MNEMONICS_INSTRUCTIONS}`;
    
    if (isPdf) {
      // For PDFs, use both the summary and a portion of the base64 content
      const pdfPrompt = `Based on this summary of a samba rhythm pattern: "${summary}"
      
And using the PDF content provided in base64 format (which contains the actual notation),
create 5 vocal mnemonics (syllables or words) that match the rhythm patterns in the PDF.
Look for patterns in the notation and create mnemonics that follow these rhythms.

${mnemonicsPromptBase}

PDF base64 content (first part): ${content.substring(0, 10000)}${content.length > 10000 ? '...' : ''}`;

      response = await generateChatCompletion([
        { role: "system", content: PROMPT_TEMPLATES.SYSTEM_MNEMONICS },
        { role: "user", content: pdfPrompt }
      ], 'GPT_4O_MINI');
      
      console.log('Generated mnemonics using PDF content');
    } else {
      // For text content
      const prompt = `Based on this summary: "${summary}" 
      
And this samba notation content:
"${content.substring(0, 1000)}${content.length > 1000 ? '...' : ''}"

Create 5 vocal mnemonics (syllables or words) that match the rhythm patterns in this notation.
Consider the primary accents, syncopations, and any special patterns described.

${mnemonicsPromptBase}`;

      response = await generateChatCompletion([
        { role: "system", content: PROMPT_TEMPLATES.SYSTEM_MNEMONICS },
        { role: "user", content: prompt }
      ], 'GPT_4O_MINI');
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
    return FALLBACK_MNEMONICS;
  } catch (error) {
    console.error('Failed to generate mnemonics:', error);
    return FALLBACK_MNEMONICS;
  }
} 