import { NextRequest, NextResponse } from "next/server";
import { generateVisionAnalysis } from "@/lib/aiClient";

export async function POST(req: NextRequest) {
  try {
    console.log("[/api/generate-mnemonics] Received upload request");
    
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const prompt = formData.get("prompt") as string || "Analyze this samba notation and provide mnemonics for the patterns";

    if (!file) {
      console.error("[/api/generate-mnemonics] No file provided in request");
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Get the file name
    const filename = file.name;
    console.log("[/api/generate-mnemonics] Processing file:", filename);
    
    // Convert the file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    console.log("[/api/generate-mnemonics] File converted to base64, size:", buffer.length);

    // Process with AI
    console.log("[/api/generate-mnemonics] Sending to AI model:", "GPT_4O_MINI");
    const analysisResult = await generateVisionAnalysis(
      filename,
      base64,
      prompt,
      "GPT_4O_MINI"
    );

    console.log("[/api/generate-mnemonics] Received AI analysis result");

    // Try to parse mnemonics from the analysis result
    let mnemonics = [];
    try {
      // Look for potential JSON content in the response
      const jsonMatch = analysisResult.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        const parsedJson = JSON.parse(jsonMatch[1].trim());
        if (Array.isArray(parsedJson)) {
          mnemonics = parsedJson;
        }
      } else {
        // Fallback format
        mnemonics = [
          {
            text: "DUM ka DUM ka",
            pattern: "Basic Pattern",
            description: "Simple samba rhythm"
          }
        ];
      }
    } catch (parseError) {
      console.error("[/api/generate-mnemonics] Error parsing mnemonics from AI result:", parseError);
      mnemonics = [
        {
          text: "Example vocal pattern",
          pattern: "Example pattern",
          description: "This is a placeholder since the AI response couldn't be parsed as JSON"
        }
      ];
    }

    // Create the result
    const result = {
      filename,
      aiSummary: analysisResult,
      mnemonics
    };

    console.log("[/api/generate-mnemonics] Returning result to client");
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[/api/generate-mnemonics] Error processing file:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred processing the file" },
      { status: 500 }
    );
  }
} 