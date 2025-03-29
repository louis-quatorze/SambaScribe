import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { aiProcessFile } from "@/lib/services/aiPdfProcessor";

export async function GET(request: NextRequest) {
  try {
    // Create a simple test text file
    const testContent = `Surdo xxx o-o break
Caixa x-x-x-x-
Repinique xoxoxo
Tamborim x-x-x-
Break: everyone stop
Surdo solo: x--x--x`;

    const testFilename = `test-${Date.now()}.txt`;
    const filePath = join(process.cwd(), 'uploads', testFilename);
    
    await writeFile(filePath, testContent);
    
    // Process the file with AI
    const result = await aiProcessFile(testFilename);
    
    return NextResponse.json({ 
      success: true, 
      result,
      message: 'Test file processed successfully with AI'
    });
  } catch (error) {
    console.error('Test processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process test file' },
      { status: 500 }
    );
  }
} 