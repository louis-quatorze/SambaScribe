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

    // Fetch the PDF content from the local URL
    const pdfResponse = await fetch(pdfUrl);
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