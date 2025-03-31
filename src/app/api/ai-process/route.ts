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
          mnemonics: ["Please provide a valid file", "Ensure the file is uploaded correctly", "Try again with a different file"]
        }
      }, { status: 400 });
    }

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
            "Error in processing",
            "Please try again with a different file",
            "Text files work best",
            "Reduce file size if using PDF",
            "Contact support if issue persists"
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
    
    console.log("API: Returning response:", response);
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
          "Error in processing",
          "Please try again",
          "Use smaller files",
          "Text format preferred",
          "Contact support if needed"
        ]
      }
    });
  }
} 