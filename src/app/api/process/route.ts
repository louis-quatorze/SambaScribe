import { NextRequest, NextResponse } from "next/server";
import { aiProcessFile } from "@/lib/services/aiPdfProcessor";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const filename = data?.filename;

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json(
        { error: "Invalid or missing filename" },
        { status: 400 }
      );
    }

    const notationData = await aiProcessFile(filename);

    return NextResponse.json({ 
      success: true,
      data: notationData
    });
  } catch (error) {
    console.error("Processing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process file" },
      { status: 500 }
    );
  }
} 