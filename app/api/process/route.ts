import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { generateChatCompletion } from "@/lib/aiClient";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { fileUrl } = await req.json();
    console.log("[/api/process] Received fileUrl:", fileUrl);

    if (!fileUrl) {
      return NextResponse.json(
        { error: "No file URL provided" },
        { status: 400 }
      );
    }

    // Extract filename from URL
    const urlObj = new URL(fileUrl, "http://localhost");
    const filename = path.basename(urlObj.pathname);
    console.log("[/api/process] Processing file:", filename);

    // Determine file type
    const isPdf = filename.toLowerCase().endsWith('.pdf');
    console.log("[/api/process] File type:", isPdf ? "PDF" : "Text");

    // Get the file content - read directly from filesystem for samples
    let content = "";
    let contentType = "text";
    try {
      // First try to read from public/samples directory (for sample files)
      if (fileUrl.includes("/samples/")) {
        const filePath = join(process.cwd(), "public", urlObj.pathname);
        console.log("[/api/process] Reading from file path:", filePath);
        
        // Read the file as buffer
        const fileBuffer = await readFile(filePath);
        
        if (isPdf) {
          // For PDFs, keep as base64 encoded
          content = fileBuffer.toString('base64');
          contentType = "base64";
          console.log("[/api/process] Successfully read PDF, size:", fileBuffer.length);
        } else {
          // For text files, convert to string
          content = fileBuffer.toString('utf-8');
          console.log("[/api/process] Successfully read text file, length:", content.length);
        }
      } else {
        // For external URLs, fetch the content
        console.log("[/api/process] Fetching external URL:", fileUrl);
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        
        const buffer = await response.arrayBuffer();
        if (isPdf) {
          content = Buffer.from(buffer).toString('base64');
          contentType = "base64";
        } else {
          content = Buffer.from(buffer).toString('utf-8');
        }
      }
    } catch (fileError: any) {
      console.error("[/api/process] File read error:", fileError);
      return NextResponse.json(
        { error: `Failed to read file: ${fileError.message}` },
        { status: 500 }
      );
    }

    // Process with AI - simplify by directly using the model with the file content
    console.log("[/api/process] Sending content to AI model, contentType:", contentType);
    
    // Generate a summary based on content type
    let aiSummary = "";
    let contentForAi = contentType === "base64" 
      ? `This is a base64 encoded ${isPdf ? "PDF" : "binary"} file. Here's the beginning: ${content.substring(0, 1000)}...`
      : content.substring(0, 5000);
      
    // Call AI model for summary
    aiSummary = await generateChatCompletion({
      model: 'GPT_4O_MINI',
      messages: [
        {
          role: "system",
          content: "You are an expert in samba music notation and Brazilian percussion. Analyze the provided document and create a concise summary."
        },
        {
          role: "user",
          content: `Analyze this samba notation document and provide a summary of its key elements:\n\n${contentForAi}`
        }
      ]
    });
    
    console.log("[/api/process] AI summary generated successfully");

    // Generate mnemonics - same approach for both content types
    const mnemonicsResponse = await generateChatCompletion({
      model: 'GPT_4O_MINI', 
      messages: [
        {
          role: "system",
          content: "You are a music educator specializing in samba percussion. Generate helpful vocal mnemonics for rhythm patterns. Return JSON array."
        },
        {
          role: "user",
          content: `Based on this samba notation document, generate mnemonics that help remember the rhythms. Return a JSON array with this structure:
          [
            {
              "text": "the mnemonic syllables",
              "pattern": "the section label or pattern name",
              "description": "brief description of the rhythm"
            }
          ]
          
          Document content: ${contentForAi}`
        }
      ]
    });
    
    console.log("[/api/process] AI mnemonics generated successfully");

    // Parse mnemonics from the response
    let mnemonics = [];
    try {
      // Try to parse JSON from the response
      const cleanedResponse = mnemonicsResponse.trim();
      
      if (cleanedResponse.startsWith('[') && cleanedResponse.endsWith(']')) {
        mnemonics = JSON.parse(cleanedResponse);
      } else if (cleanedResponse.includes('```json')) {
        // Handle markdown code blocks
        const jsonMatch = cleanedResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          mnemonics = JSON.parse(jsonMatch[1].trim());
        }
      } else {
        // Fallback mnemonics
        console.warn("[/api/process] Response was not in JSON format:", cleanedResponse.substring(0, 100));
        mnemonics = [
          {
            text: "DUM ka DUM ka",
            pattern: "Basic Pattern",
            description: "Simple samba rhythm"
          }
        ];
      }
    } catch (parseError) {
      console.error("[/api/process] Error parsing mnemonics:", parseError);
      mnemonics = [
        {
          text: "DUM ka DUM ka",
          pattern: "Basic Pattern",
          description: "Simple samba rhythm"
        }
      ];
    }

    // Return the result
    console.log("[/api/process] Returning response to client");
    return NextResponse.json({
      filename,
      aiSummary,
      mnemonics
    });
    
  } catch (error: any) {
    console.error("[/api/process] Error processing request:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred processing the file" },
      { status: 500 }
    );
  }
} 