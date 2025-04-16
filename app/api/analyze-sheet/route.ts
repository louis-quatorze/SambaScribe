import { NextRequest, NextResponse } from "next/server";
import { analyzeMusicSheetPdf } from "@/lib/aiClient";

export const config = {
  api: {
    // Increasing the maximum file size to 15MB
    bodyParser: {
      sizeLimit: "15mb",
    },
  },
};

export async function POST(req: NextRequest) {
  try {
    console.log("[/api/analyze-sheet] Received upload request");
    
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const prompt = formData.get("prompt") as string;
    
    // Get optional AI parameters if provided
    const temperature = formData.get("temperature") ? parseFloat(formData.get("temperature") as string) : undefined;
    const top_p = formData.get("top_p") ? parseFloat(formData.get("top_p") as string) : undefined;
    const top_k = formData.get("top_k") ? parseInt(formData.get("top_k") as string) : undefined;
    const model = formData.get("model") as string || "GPT_4O";

    if (!file) {
      console.error("[/api/analyze-sheet] No file provided in request");
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate the file type
    if (file.type !== "application/pdf") {
      console.error("[/api/analyze-sheet] Invalid file type:", file.type);
      return NextResponse.json(
        { error: "Invalid file type. Please upload a PDF file" },
        { status: 400 }
      );
    }

    // Get the file name and size for logging
    console.log("[/api/analyze-sheet] Processing file:", file.name, "Size:", Math.round(file.size / 1024), "KB");

    // Process the PDF with the AI model
    const result = await analyzeMusicSheetPdf(file, prompt, {
      temperature,
      top_p,
      top_k,
      model: model as any,
    });

    // Create the response data
    const responseData = {
      filename: file.name,
      aiSummary: result.analysis,
      mnemonics: result.mnemonics,
    };

    console.log("[/api/analyze-sheet] Analysis complete, returning results");
    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("[/api/analyze-sheet] Error processing file:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred processing the file" },
      { status: 500 }
    );
  }
} 