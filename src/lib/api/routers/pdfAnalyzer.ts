import { z } from 'zod';
import { createTRPCRouter, protectedProcedure, publicProcedure } from '@/lib/api/trpc';
// import { generateChatCompletion } from '@/lib/aiClient'; // No longer using this
import Anthropic from "@anthropic-ai/sdk"; // Added Anthropic SDK
import fetch from "node-fetch"; // Added node-fetch for fetching PDF
import { TRPCError } from '@trpc/server'; // Added for error handling

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Define our specialized samba analysis prompt
const defaultSambaPrompt = "Act as a music analyst for a samba piece. Your task is to offer a concise summary of the composition, identifying its style, the type of samba (if recognizable), and the general instrumentation or ensemble setup. Pinpoint rhythm patterns, breaks, section labels, and captions from the file, and outline the overall structure and flow of the piece based on these elements. For each unique rhythm or break, devise a mnemonic entry. Deliver your complete response in the provided JSON format: {\"summary\": \"brief piece description and structure\", \"mnemonics\": [{\"pattern\": \"rhythm description\", \"mnemonic\": \"memorable phrase\", \"description\": \"relation of phrase to rhythm\"}]}. Each mnemonic should assist performers in internalizing the rhythm, be vivid, amusing, easy to remember, and encapsulate the feel or phrasing of the pattern.";

// Function to get base URL (needed for resolving relative URLs)
function getBaseUrl() {
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    // Assume localhost for development if not on Vercel
    return `http://localhost:${process.env.PORT ?? 3000}`;
}

// Function to check if a URL is for a sample PDF
function isSamplePdf(url: string): boolean {
  // Extract the filename from the URL
  const urlParts = url.split('/');
  const filename = urlParts[urlParts.length - 1];
  
  // List of sample PDF filenames
  const sampleFilenames = ["Aainjaa.pdf", "Mangueira.pdf", "Samba-Da-Musa.pdf"];
  
  // Check if the filename is in the list of sample PDFs
  return sampleFilenames.includes(filename);
}

export const pdfAnalyzerRouter = createTRPCRouter({
  analyzePdf: publicProcedure
    .input(
      z.object({
        pdfUrl: z.string().url({ message: 'Invalid PDF URL provided.' }),
        prompt: z.string().optional().default(defaultSambaPrompt),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { pdfUrl, prompt } = input;
      
      // Log the actual prompt being used
      console.log(`[pdfAnalyzer] Using prompt: ${prompt.length > 100 ? 
        prompt.substring(0, 100) + "..." : prompt}`);
      console.log(`[pdfAnalyzer] Using default samba prompt: ${prompt === defaultSambaPrompt}`);

      // Check if this is a sample PDF or if the user is authenticated
      const isSample = isSamplePdf(pdfUrl);
      if (!isSample && (!ctx.session || !ctx.session.user)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required to analyze non-sample PDFs",
        });
      }
      
      // Get user ID if authenticated, or use 'anonymous' for sample PDFs
      const userId = ctx.session?.user?.id || 'anonymous';

      if (!process.env.ANTHROPIC_API_KEY) {
          throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Anthropic API Key is not configured.',
          });
      }

      console.log(`User ${userId} initiating PDF analysis via Anthropic for URL: ${pdfUrl}`);

      try {
        // --- Replicating logic from /api/parse-pdf --- 

        // 1. Resolve URL to absolute
        let absolutePdfUrl = pdfUrl;
        // Simple check if it's already absolute
        if (!pdfUrl.startsWith('http://') && !pdfUrl.startsWith('https://')) {
             // Assume relative URLs need the base origin
             const origin = getBaseUrl(); 
             absolutePdfUrl = `${origin}${pdfUrl.startsWith('/') ? '' : '/'}${pdfUrl}`;
             console.log("[pdfAnalyzer] Converted relative URL to absolute:", absolutePdfUrl);
        }

        // 2. Fetch the PDF content
        console.log("[pdfAnalyzer] Fetching PDF from:", absolutePdfUrl);
        const pdfResponse = await fetch(absolutePdfUrl);
        if (!pdfResponse.ok) {
          throw new Error(`Failed to fetch PDF (${pdfResponse.status}): ${pdfResponse.statusText}. URL: ${absolutePdfUrl}`);
        }
        const pdfBuffer = await pdfResponse.buffer();
        const base64Pdf = pdfBuffer.toString('base64');
        console.log(`[pdfAnalyzer] Fetched PDF (${pdfBuffer.length} bytes)`);

        // 3. Call Anthropic API
        console.log("[pdfAnalyzer] Calling Anthropic Sonnet model...");
        const modelName = "claude-3-5-sonnet-20241022";
        console.log(`[pdfAnalyzer] Model being used: ${modelName}`);
        
        // Create the final prompt - either custom or default
        const finalPrompt = prompt || defaultSambaPrompt;

        const response = await anthropic.messages.create({
            model: modelName,
            max_tokens: 4000,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "document",
                    source: {
                      type: "base64",
                      media_type: "application/pdf",
                      data: base64Pdf
                    }
                  },
                  {
                    type: "text",
                    text: finalPrompt
                  }
                ]
              }
            ]
          });

          console.log("[pdfAnalyzer] Received response from Anthropic");

          // Extract text content from the response
          let analysisText = "";
          if (Array.isArray(response.content)) {
            response.content.forEach((block: any) => {
              if (block.type === "text") {
                analysisText += block.text;
              }
            });
          } else {
            analysisText = "Could not extract text analysis from the response.";
            console.warn("[pdfAnalyzer] Unexpected Anthropic response format:", response.content);
          }
          
          // Log a truncated version of the response for debugging
          console.log(`[pdfAnalyzer] Response text (${analysisText.length} chars): ${
            analysisText.length > 500 ? 
            analysisText.substring(0, 250) + "..." + analysisText.substring(analysisText.length - 250) : 
            analysisText
          }`);
          
          // Try to parse JSON if the response looks like it contains JSON
          try {
            if (analysisText.includes('{') && analysisText.includes('}')) {
              console.log("[pdfAnalyzer] Response may contain JSON, attempting to extract it");
              
              // Look for JSON within code blocks
              const jsonMatch = analysisText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
              let jsonContent = jsonMatch ? jsonMatch[1].trim() : analysisText.trim();
              
              // If we have multiple JSON objects, try to extract the main one
              if (jsonContent.includes('{') && jsonContent.includes('}')) {
                const jsonStartIdx = jsonContent.indexOf('{');
                const jsonEndIdx = jsonContent.lastIndexOf('}') + 1;
                if (jsonStartIdx >= 0 && jsonEndIdx > jsonStartIdx) {
                  jsonContent = jsonContent.substring(jsonStartIdx, jsonEndIdx);
                }
              }
              
              // Try to parse if it looks like valid JSON
              if (jsonContent.startsWith('{') && jsonContent.endsWith('}')) {
                const parsedJson = JSON.parse(jsonContent);
                console.log("[pdfAnalyzer] Successfully parsed JSON response:", 
                  JSON.stringify({
                    keys: Object.keys(parsedJson),
                    hasSummary: !!parsedJson.summary,
                    mnemonicsCount: parsedJson.mnemonics?.length || 0
                  })
                );
              }
            }
          } catch (jsonError) {
            console.error("[pdfAnalyzer] Error parsing JSON from response:", jsonError);
          }
        // --- End of replicated logic ---

        return {
          success: true,
          analysis: analysisText, // Return extracted text
        };

      } catch (error: any) {
        console.error(`[pdfAnalyzer] Anthropic analysis failed for URL: ${pdfUrl}`, error);
        // Throw a TRPCError so the client knows it failed
        throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'An unexpected error occurred during PDF analysis.',
            cause: error, // Optionally pass the original error
        });
      }
    }),
}); 