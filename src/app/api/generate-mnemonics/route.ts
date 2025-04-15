import { NextRequest, NextResponse } from "next/server";
import { generateVisionAnalysis } from "@/lib/aiClient";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const prompt = formData.get("prompt") as string || "Analyze this samba notation and provide mnemonics for the patterns";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Get the file name
    const filename = file.name;
    
    // Convert the file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");

    // Process with AI
    const analysisResult = await generateVisionAnalysis(
      filename,
      base64,
      prompt,
      "GPT_4O_MINI"
    );

    // Parse the result into a structured format
    const result = {
      filename,
      aiSummary: analysisResult,
      mnemonics: [
        {
          pattern: "Example pattern",
          mnemonic: "Example mnemonic",
          description: "This is a placeholder since the actual parsing would depend on the AI response structure"
        }
      ]
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error processing file:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred processing the file" },
      { status: 500 }
    );
  }
} 