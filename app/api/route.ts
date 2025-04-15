import { NextRequest, NextResponse } from 'next/server';
import { readFile } from "fs/promises";
import { join } from "path";
import path from "path";

export async function GET() {
  return NextResponse.json({ message: 'SambaScribe API is working' });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileUrl } = body;
    
    console.log("[Root API] Received request:", body);
    
    if (!fileUrl) {
      return NextResponse.json(
        { error: "No file URL provided" },
        { status: 400 }
      );
    }

    // Extract filename from URL
    const urlObj = new URL(fileUrl, "http://localhost");
    const filename = path.basename(urlObj.pathname);
    console.log("[Root API] Processing file:", filename);

    // For sample files only, redirect to the /api/process endpoint
    if (fileUrl.includes("/samples/")) {
      console.log("[Root API] Redirecting sample file to /api/process");
      
      // Forward the request to /api/process
      const processResponse = await fetch(new URL("/api/process", req.url).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileUrl }),
      });
      
      if (!processResponse.ok) {
        console.error(`[Root API] /api/process failed: ${processResponse.statusText}`);
        throw new Error(`Process API failed: ${processResponse.statusText}`);
      }
      
      // Return the response from /api/process
      const data = await processResponse.json();
      return NextResponse.json(data);
    }
    
    // Simple fallback for other files - read directly and return a basic response
    try {
      // Very basic handling for root API
      console.log("[Root API] Sending simplified response");
      return NextResponse.json({
        filename,
        aiSummary: "This is a placeholder summary from the root API endpoint. For better results, use the /api/process endpoint.",
        mnemonics: [
          {
            text: "DUM ka DUM ka",
            pattern: "Basic Pattern",
            description: "Simple samba rhythm"
          }
        ]
      });
    } catch (fileError: any) {
      console.error("[Root API] Error:", fileError);
      return NextResponse.json(
        { error: `Failed to process file: ${fileError.message}` },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error("[Root API] Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred processing the file" },
      { status: 500 }
    );
  }
} 