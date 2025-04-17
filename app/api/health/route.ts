import { NextResponse } from "next/server";

/**
 * Health check endpoint for verifying the server is running
 * This is used by Render for health monitoring
 */
export async function GET() {
  return NextResponse.json(
    { status: "ok", timestamp: new Date().toISOString() },
    { status: 200 }
  );
} 