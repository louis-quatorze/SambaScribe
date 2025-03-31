import { NextRequest, NextResponse } from "next/server";
import { aiProcessFile } from "@/lib/services/aiPdfProcessor";

export async function POST(request: NextRequest) {
  let requestData: any;
  
  try {
    requestData = await request.json();
    const filename = requestData?.filename;

    if (!filename || typeof filename !== 'string') {
      console.error("Invalid or missing filename in request:", requestData);
      return NextResponse.json({ 
        success: false,
        error: "Invalid or missing filename",
        data: {
          filename: "unknown",
          aiSummary: "No valid filename was provided for processing.",
          mnemonics: [
            { text: "Please provide a valid file", pattern: "Error", description: "missing filename" },
            { text: "Ensure the file is uploaded correctly", pattern: "Error", description: "file upload issue" },
            { text: "Try again with a different file", pattern: "Error", description: "file format issue" }
          ]
        }
      }, { status: 400 });
    }

    console.log("Processing file:", filename);
    const notationData = await aiProcessFile(filename);
    
    // Validate the response data before returning
    if (!notationData || 
        typeof notationData !== 'object' || 
        typeof notationData.filename !== 'string' || 
        typeof notationData.aiSummary !== 'string' || 
        !Array.isArray(notationData.mnemonics)) {
      console.error("Invalid notation data format:", notationData);
      return NextResponse.json({ 
        success: false,
        error: "Failed to generate valid AI notation data",
        data: {
          filename: filename,
          aiSummary: "Failed to process the file. The system encountered an error.",
          mnemonics: [
            { text: "Error in processing", pattern: "Error", description: "processing failure" },
            { text: "Please try again with a different file", pattern: "Error", description: "file format issue" },
            { text: "Text files work best", pattern: "Tip", description: "file format recommendation" },
            { text: "Reduce file size if using PDF", pattern: "Tip", description: "file size recommendation" },
            { text: "Contact support if issue persists", pattern: "Support", description: "get help" }
          ]
        }
      });
    }
    
    console.log("API: Generated AI notation data:", notationData);

    // Ensure we're always returning in the same format
    const response = { 
      success: true,
      data: {
        filename: notationData.filename,
        aiSummary: notationData.aiSummary,
        mnemonics: notationData.mnemonics
      }
    };
    
    console.log("API: Returning response:", JSON.stringify(response, null, 2));
    return NextResponse.json(response);
  } catch (error) {
    console.error("AI Processing error:", error);
    
    // Return a valid data structure even in case of error
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : "Failed to process file with AI",
      data: {
        filename: requestData?.filename || "unknown-file",
        aiSummary: "An error occurred during processing. Please try again with a different file.",
        mnemonics: [
          { text: "Error in processing", pattern: "Error", description: "processing failure" },
          { text: "Please try again", pattern: "Error", description: "retry recommendation" },
          { text: "Use smaller files", pattern: "Tip", description: "file size recommendation" },
          { text: "Text format preferred", pattern: "Tip", description: "file format recommendation" },
          { text: "Contact support if needed", pattern: "Support", description: "get help" }
        ]
      }
    });
  }
} 