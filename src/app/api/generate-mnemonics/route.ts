import { NextRequest, NextResponse } from "next/server";
import { generateVisionAnalysis } from "@/lib/aiClient";

export async function POST(req: NextRequest) {
  try {
    console.log("[/api/generate-mnemonics] Received upload request");
    
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const defaultPrompt = "Analyze this PDF samba notation (provided as base64), identify all rhythm patterns and breaks, and generate mnemonics for each pattern. Return a JSON array of mnemonics with pattern names and descriptions.";
    const prompt = formData.get("prompt") as string || defaultPrompt;

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
    console.log("[/api/generate-mnemonics] File converted to base64, size:", buffer.length, "bytes |", base64.length, "chars (base64)");

    // Check if base64 content is valid
    if (base64.length < 100) {
      console.error("[/api/generate-mnemonics] Base64 content seems too small:", base64.length);
      return NextResponse.json(
        { error: "The uploaded file appears to be empty or corrupted" },
        { status: 400 }
      );
    }

    console.log("[/api/generate-mnemonics] Using prompt:", prompt);
    console.log("[/api/generate-mnemonics] Sending to AI model:", "GPT_4O_MINI", "| Full base64 content length:", base64.length);
    
    // Process with AI - send the COMPLETE base64 data
    const analysisResult = await generateVisionAnalysis(
      filename,
      base64,
      prompt,
      "GPT_4O_MINI"
    );

    console.log("[/api/generate-mnemonics] Received AI analysis result of length:", analysisResult.length);
    console.log("[/api/generate-mnemonics] First 200 chars of response:", analysisResult.substring(0, 200).replace(/\n/g, " "));

    // Parse the result into a structured format
    let mnemonics = [];
    try {
      // Look for potential JSON content in the response
      const jsonMatch = analysisResult.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        console.log("[/api/generate-mnemonics] Found JSON block in response");
        const jsonContent = jsonMatch[1].trim();
        try {
          const parsedJson = JSON.parse(jsonContent);
          if (Array.isArray(parsedJson)) {
            mnemonics = parsedJson;
            console.log(`[/api/generate-mnemonics] Successfully parsed ${mnemonics.length} mnemonics from JSON`);
          }
        } catch (jsonError) {
          console.error("[/api/generate-mnemonics] JSON parse error:", jsonError, "JSON content:", jsonContent.substring(0, 200));
        }
      } else {
        console.log("[/api/generate-mnemonics] No JSON code block found in response");
      }
      
      if (mnemonics.length === 0) {
        // Fallback format
        console.log("[/api/generate-mnemonics] Using fallback mnemonics");
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

    console.log("[/api/generate-mnemonics] Returning result to client with", mnemonics.length, "mnemonics");
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[/api/generate-mnemonics] Error processing file:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred processing the file" },
      { status: 500 }
    );
  }
}
