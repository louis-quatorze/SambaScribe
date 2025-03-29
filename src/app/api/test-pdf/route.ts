import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { processTextFile } from "@/lib/services/textProcessor";

// Sample test text content
const TEST_TEXT_CONTENT = `Surdo xxx o-o break
Caixa x-x-x-x-
Repinique xoxoxo
Tamborim x-x-x-
Break: everyone stop
Surdo solo: x--x--x`;

export async function GET(request: NextRequest) {
  try {
    // Create a test text file
    const testFilename = `test-${Date.now()}.txt`;
    const filePath = join(process.cwd(), 'uploads', testFilename);
    
    await writeFile(filePath, TEST_TEXT_CONTENT);
    
    // Process the text file
    const result = await processTextFile(testFilename);
    
    return NextResponse.json({ 
      success: true, 
      result,
      message: 'Text file processed successfully'
    });
  } catch (error) {
    console.error('Test text processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process test text file' },
      { status: 500 }
    );
  }
} 