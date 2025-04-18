import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logEventsToFile } from "@/lib/server/analytics";
import { type AnalyticsEvent } from "@/lib/analytics";
// Import the database logger, but handle the case where it might fail
// due to Prisma client generation issues
let dbLogger: any = null;
try {
  dbLogger = require("@/lib/logging/dbLogger");
} catch (error) {
  console.error("[Analytics API] Failed to load database logger:", error);
}

interface AnalyticsRequest {
  events: AnalyticsEvent[];
}

/**
 * Endpoint to receive analytics events
 */
export async function POST(req: NextRequest) {
  try {
    // Get user session if available
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || 'anonymous';
    const userEmail = session?.user?.email;
    
    // Parse request body with better error handling
    let body: AnalyticsRequest;
    try {
      body = await req.json() as AnalyticsRequest;
      console.log('[Analytics API] Received request:', JSON.stringify(body));
    } catch (parseError) {
      console.error('[Analytics API] JSON parse error:', parseError);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body', 
        details: String(parseError) 
      }, { status: 400 });
    }
    
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
    }
    
    if (!Array.isArray(body.events)) {
      return NextResponse.json({ error: 'Request body must contain events array' }, { status: 400 });
    }
    
    if (body.events.length === 0) {
      return NextResponse.json({ error: 'Events array cannot be empty' }, { status: 400 });
    }
    
    // Validate each event
    const validEvents = body.events.filter(event => {
      const isValid = event && 
             typeof event === 'object' && 
             typeof event.type === 'string' && 
             typeof event.target === 'string' &&
             typeof event.timestamp === 'number';
      
      if (!isValid) {
        console.error('[Analytics API] Invalid event format:', event);
      }
      
      return isValid;
    });
    
    if (validEvents.length === 0) {
      return NextResponse.json({ error: 'No valid events found in request' }, { status: 400 });
    }
    
    if (validEvents.length < body.events.length) {
      console.log('[Analytics API] Filtered out invalid events:', 
                 body.events.length - validEvents.length);
    }
    
    // Log upload events specifically for debugging
    const uploadEvents = validEvents.filter(event => event.type === 'upload');
    if (uploadEvents.length > 0) {
      console.log(`[Analytics API] Processing ${uploadEvents.length} upload events:`, 
                  JSON.stringify(uploadEvents));
    }
    
    // Gather client information
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    // 1. Log events to file system
    const fileLogged = logEventsToFile(validEvents);
    if (!fileLogged) {
      console.error('[Analytics API] Failed to log events to file');
    }
    
    // 2. Log events to database if available
    let dbLogged = false;
    let dbLoggedCount = 0;
    if (dbLogger) {
      try {
        for (const event of validEvents) {
          const success = await dbLogger.logEventToDatabase(
            event,
            userId,
            userEmail,
            clientIp,
            userAgent
          );
          if (success) dbLoggedCount++;
        }
        dbLogged = dbLoggedCount > 0;
        if (dbLoggedCount < validEvents.length) {
          console.warn(`[Analytics API] Only logged ${dbLoggedCount}/${validEvents.length} events to database`);
        }
      } catch (error) {
        console.error('[Analytics API] Database logging error:', error);
      }
    }
    
    // Force a flush of any buffered logs to ensure visibility
    console.log(`[Analytics API] Processed ${validEvents.length} events. File: ${fileLogged ? '✓' : '✗'}, Database: ${dbLogged ? `✓ (${dbLoggedCount})` : '✗'}`);
    
    return NextResponse.json({ 
      success: true, 
      count: validEvents.length,
      storage: {
        file: fileLogged,
        database: dbLogged,
        dbCount: dbLoggedCount
      }
    });
  } catch (error) {
    console.error('[Analytics API] Error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
} 