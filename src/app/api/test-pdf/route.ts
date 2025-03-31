import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ 
      success: true, 
      message: 'Test endpoint. This is a simplified version to fix build issues.'
    });
  } catch (error) {
    console.error('Test processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error occurred' },
      { status: 500 }
    );
  }
} 