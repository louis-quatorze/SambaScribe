/**
 * Server-side analytics module for logging to files
 * This file should ONLY be imported in server components or API routes
 */
import fs from 'fs';
import path from 'path';
import { type AnalyticsEvent } from '../analytics';

// Path for log files
const LOG_DIR = process.env.ANALYTICS_LOG_DIR || './logs';
const LOG_FILE = path.join(LOG_DIR, 'analytics.log');

// Ensure the log directory exists
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch (error) {
  console.error("[Server Analytics] Error creating log directory:", error);
}

/**
 * Write events to a local log file (server-side only)
 * @returns boolean indicating whether logging was successful
 */
export function logEventsToFile(events: AnalyticsEvent[]): boolean {
  if (!events || !Array.isArray(events) || events.length === 0) {
    console.error('[Server Analytics] No valid events to log');
    return false;
  }
  
  try {
    const logEntries = events.map(event => {
      try {
        // Make sure timestamp is valid
        const timestamp = new Date(event.timestamp).toISOString();
        // Handle case where metadata might cause issues
        const safeEvent = {
          ...event,
          metadata: event.metadata ? JSON.stringify(event.metadata) : null
        };
        return `${timestamp} | ${JSON.stringify(safeEvent)}\n`;
      } catch (error) {
        console.error('[Server Analytics] Error formatting event:', error);
        return null;
      }
    }).filter(Boolean); // Remove any entries that failed to format
    
    if (logEntries.length === 0) {
      console.error('[Server Analytics] All events failed to format');
      return false;
    }
    
    fs.appendFileSync(LOG_FILE, logEntries.join(''));
    console.log(`[Server Analytics] Logged ${logEntries.length}/${events.length} events to file: ${LOG_FILE}`);
    return true;
  } catch (error) {
    console.error('[Server Analytics] Failed to write to log file:', error);
    return false;
  }
}

/**
 * Read analytics log file content
 */
export function readLogFile(maxLines: number = 1000): string {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return '';
    }
    
    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    const lines = content.split('\n');
    return lines.slice(-maxLines).join('\n');
  } catch (error) {
    console.error('[Server Analytics] Failed to read log file:', error);
    return '';
  }
}

/**
 * Parse log entries from the file
 */
export function parseLogEntries(
  startDate?: Date, 
  endDate?: Date
): AnalyticsEvent[] {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return [];
    }
    
    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    return lines.map(line => {
      try {
        const parts = line.split(' | ');
        if (parts.length < 2) return null;
        
        const timestamp = new Date(parts[0]).getTime();
        const eventData = JSON.parse(parts[1]);
        
        // Filter by date range if provided
        if (startDate && timestamp < startDate.getTime()) return null;
        if (endDate && timestamp > endDate.getTime()) return null;
        
        // Ensure the metadata is consistently an object
        if (eventData.metadata) {
          // If it's already a string representation of an object, leave it
          if (typeof eventData.metadata === 'string' && 
              (eventData.metadata.startsWith('{') || eventData.metadata.startsWith('['))) {
            // It's already a JSON string, leave it as is
          } else if (typeof eventData.metadata === 'object') {
            // It's an object, which is fine
          } else {
            // For any other format, convert to string to ensure consistency
            eventData.metadata = String(eventData.metadata);
          }
        }
        
        return {
          ...eventData,
          timestamp
        };
      } catch (error) {
        console.error("Error parsing log entry:", error);
        return null;
      }
    }).filter(Boolean) as AnalyticsEvent[];
  } catch (error) {
    console.error('[Server Analytics] Failed to parse log entries:', error);
    return [];
  }
} 