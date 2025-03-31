import { NextRequest, NextResponse } from "next/server";
import { generateMnemonics } from "@/lib/services/aiPdfProcessor";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { filename, summary } = data;

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json(
        { error: "Invalid or missing filename" },
        { status: 400 }
      );
    }

    if (!summary || typeof summary !== 'string') {
      return NextResponse.json(
        { error: "Invalid or missing summary" },
        { status: 400 }
      );
    }

    const mnemonics = await generateMnemonics(filename, summary);
    console.log("API: Generated mnemonics:", mnemonics);

    return NextResponse.json({ 
      success: true,
      mnemonics
    });
  } catch (error) {
    console.error("Mnemonics Generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate mnemonics" },
      { status: 500 }
    );
  }
} 