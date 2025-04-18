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
    
    // Ensure emails are properly extracted from metadata if not already present
    const enhancedEvents = events.map(event => {
      // If userEmail is not present but exists in metadata, extract it
      if (!event.userEmail && event.metadata && typeof event.metadata === 'object' && event.metadata.email) {
        event.userEmail = event.metadata.email;
      }
      return event;
    });
    
    // Compute statistics
    const eventTypes = enhancedEvents.map(event => event.type);
    const eventCounts = eventTypes.reduce((counts: Record<string, number>, type: string) => {
      counts[type] = (counts[type] || 0) + 1;
      return counts;
    }, {});
    
    // Extract user IDs if available
    const userCounts: Record<string, number> = {};
    enhancedEvents.forEach(event => {
      // Prefer email over userId for tracking user activity
      const userIdentifier = event.userEmail || 
                           (event.metadata && typeof event.metadata === 'object' && event.metadata.email) || 
                           event.userId || 
                           'anonymous';
      
      userCounts[userIdentifier] = (userCounts[userIdentifier] || 0) + 1;
    });
    
    return NextResponse.json({
      events: enhancedEvents,
      eventCounts,
      userCounts,
      total: enhancedEvents.length,
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