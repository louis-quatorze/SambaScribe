import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/lib/api/trpc';
// import { generateChatCompletion } from '@/lib/aiClient'; // No longer using this
import Anthropic from "@anthropic-ai/sdk"; // Added Anthropic SDK
import fetch from "node-fetch"; // Added node-fetch for fetching PDF
import { TRPCError } from '@trpc/server'; // Added for error handling

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Function to get base URL (needed for resolving relative URLs)
function getBaseUrl() {
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    // Assume localhost for development if not on Vercel
    return `http://localhost:${process.env.PORT ?? 3000}`;
  }

export const pdfAnalyzerRouter = createTRPCRouter({
  analyzePdf: protectedProcedure
    .input(
      z.object({
        pdfUrl: z.string().url({ message: 'Invalid PDF URL provided.' }),
        prompt: z.string().optional().default('Analyze the content of this PDF document and provide a summary.'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { pdfUrl, prompt } = input;
      const userId = ctx.session.user.id;

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
        const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022", // Use the specific Sonnet model
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
                    text: prompt
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