import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseLogEntries } from "@/lib/server/analytics";

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
    
    // Parse query parameters for date range
    const url = new URL(req.url);
    const startDate = url.searchParams.get('start') 
      ? new Date(url.searchParams.get('start')!) 
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default to last 7 days
    
    const endDate = url.searchParams.get('end')
      ? new Date(url.searchParams.get('end')!)
      : new Date();
    
    // Ensure endDate is at the end of the day
    endDate.setHours(23, 59, 59, 999);
    
    // Parse log entries within date range
    const events = parseLogEntries(startDate, endDate);
    
    // Compute statistics
    const eventTypes = events.map(event => event.type);
    const eventCounts = eventTypes.reduce((counts: Record<string, number>, type: string) => {
      counts[type] = (counts[type] || 0) + 1;
      return counts;
    }, {});
    
    // Extract user IDs if available
    const userCounts: Record<string, number> = {};
    events.forEach(event => {
      if (event.metadata && event.metadata.userId) {
        const userId = event.metadata.userId;
        userCounts[userId] = (userCounts[userId] || 0) + 1;
      }
      
      // Check for email in metadata
      if (event.metadata && event.metadata.email) {
        const email = event.metadata.email;
        userCounts[email] = (userCounts[email] || 0) + 1;
      }
    });
    
    return NextResponse.json({
      events,
      eventCounts,
      userCounts,
      total: events.length,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    });
  } catch (error) {
    console.error("[Admin Analytics API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
} 