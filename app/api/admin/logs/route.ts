import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readLogFile } from "@/lib/server/analytics";

// Authorized user for analytics
const AUTHORIZED_EMAIL = "larivierlouise@gmail.com";
const AUTHORIZED_PROVIDER = "google";

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check if the user is authorized
    if (session.user.email !== AUTHORIZED_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    // Read log file content (limits to 1000 lines by default)
    const logContent = readLogFile();
    
    if (!logContent) {
      return new NextResponse(
        "No analytics log file found or file is empty",
        { status: 404 }
      );
    }
    
    // Reverse the log content lines to show newest first
    const reversedLogContent = logContent
      .split('\n')
      .reverse()
      .join('\n');
    
    // Return reversed log content as text
    return new NextResponse(reversedLogContent, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error("[Admin Logs API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 