import { NextRequest, NextResponse } from "next/server";
import { processPdfFile } from "@/lib/services/pdfProcessor";

export async function POST(request: NextRequest) {
  try {
    const { filename } = await request.json();

    if (!filename) {
      return NextResponse.json(
        { error: "No filename provided" },
        { status: 400 }
      );
    }

    const notationData = await processPdfFile(filename);

    return NextResponse.json({ 
      success: true,
      data: notationData
    });
  } catch (error) {
    console.error("Processing error:", error);
    return NextResponse.json(
      { error: "Failed to process PDF file" },
      { status: 500 }
    );
  }
} 