import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import fetch from "node-fetch";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pdfUrl, prompt } = body;
    
    if (!pdfUrl) {
      return NextResponse.json(
        { error: "No PDF URL provided" },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: "No prompt provided" },
        { status: 400 }
      );
    }

    console.log("[/api/parse-pdf] Processing PDF from URL:", pdfUrl);
    console.log("[/api/parse-pdf] Using prompt:", prompt);

    // Convert relative URL to absolute URL if needed
    let absolutePdfUrl = pdfUrl;
    if (pdfUrl.startsWith('/')) {
      // Get the origin from the request URL
      const origin = req.nextUrl.origin;
      
      // Special case for files in the samples directory - these are served from the public directory
      if (pdfUrl.includes('/samples/')) {
        absolutePdfUrl = `${origin}${pdfUrl}`;
      } 
      // Normal API routes
      else if (pdfUrl.startsWith('/api/')) {
        absolutePdfUrl = `${origin}${pdfUrl}`;
      }
      // Fallback for any other paths
      else {
        absolutePdfUrl = `${origin}${pdfUrl}`;
      }
      
      console.log("[/api/parse-pdf] Converted to absolute URL:", absolutePdfUrl);
    }

    // Fetch the PDF content from the URL
    const pdfResponse = await fetch(absolutePdfUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
    }
    
    // Convert the PDF to a buffer and then to base64
    const pdfBuffer = await pdfResponse.buffer();
    const base64Pdf = pdfBuffer.toString('base64');
    
    console.log(`[/api/parse-pdf] Successfully fetched PDF (${pdfBuffer.length} bytes)`);

    // Prepare the message for Claude using base64 instead of URL
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
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

    console.log("[/api/parse-pdf] Received Claude response");
    
    return NextResponse.json({
      analysis: response.content
    });
  } catch (error: any) {
    console.error("[/api/parse-pdf] Error processing PDF:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred processing the PDF" },
      { status: 500 }
    );
  }
} 