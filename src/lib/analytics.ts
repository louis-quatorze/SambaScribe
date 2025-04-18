/**
 * Simple analytics module for tracking user interactions
 */

export type EventType = 'view' | 'click' | 'upload' | 'analyze' | 'auth';

export interface AnalyticsEvent {
  type: EventType;
  target: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

// Queue to store events until they can be sent to the server
const eventQueue: AnalyticsEvent[] = [];

/**
 * Track a user interaction event
 */
export function trackEvent(type: EventType, target: string, metadata?: Record<string, any>) {
  const event: AnalyticsEvent = {
    type,
    target,
    metadata,
    timestamp: Date.now()
  };
  
  // Add to queue
  eventQueue.push(event);
  
  // Log to console during development
  console.log('[Analytics]', event);
  
  // In a production environment, we would batch send these events
  // to the server, but for now we'll just store them and periodically flush
  if (eventQueue.length >= 10) {
    flushEvents();
  }
}

/**
 * Specific tracking functions for common events
 */
export function trackSamplePdfClick(sampleName: string) {
  trackEvent('click', 'sample_pdf', { name: sampleName });
}

export function trackFileUpload(fileType: string, fileSize: number) {
  trackEvent('upload', 'user_file', { fileType, fileSize });
  // Force flush events immediately for upload events
  forceFlushEvents().catch(error => {
    console.error('[Analytics] Failed to flush upload event:', error);
  });
}

export function trackAnalysisStart(source: 'sample' | 'upload', name: string) {
  trackEvent('analyze', 'analysis_start', { source, name });
}

export function trackAnalysisComplete(source: 'sample' | 'upload', name: string, success: boolean) {
  trackEvent('analyze', 'analysis_complete', { source, name, success });
}

/**
 * Send accumulated events to the server
 */
async function flushEvents() {
  if (eventQueue.length === 0) return;
  
  const events = [...eventQueue];
  eventQueue.length = 0; // Clear the queue
  
  try {
    // Log that we're sending events
    console.log(`[Analytics] Sending ${events.length} events to server...`);
    
    // Send to API endpoint
    const response = await fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Server response error: ${response.status} - ${errorData.error || response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`[Analytics] Successfully sent ${data.count} events to server`);
    return true;
  } catch (error) {
    console.error('[Analytics] Failed to send events:', error);
    // Put the events back in the queue
    eventQueue.unshift(...events);
    return false;
  }
}

/**
 * Manually flush events to the server
 * This can be called from components when important events occur
 */
export async function forceFlushEvents() {
  console.log('[Analytics] Force flushing events...');
  
  if (eventQueue.length === 0) {
    console.log('[Analytics] No events to flush');
    return true;
  }
  
  try {
    const result = await flushEvents();
    console.log(`[Analytics] Force flush ${result ? 'succeeded' : 'failed'} with ${eventQueue.length} events remaining in queue`);
    
    // If the first attempt failed and there are still events, try once more
    if (!result && eventQueue.length > 0) {
      console.log('[Analytics] Retrying event flush...');
      const retryResult = await flushEvents();
      console.log(`[Analytics] Retry flush ${retryResult ? 'succeeded' : 'failed'} with ${eventQueue.length} events remaining in queue`);
      return retryResult;
    }
    
    return result;
  } catch (error) {
    console.error('[Analytics] Error in forceFlushEvents:', error);
    return false;
  }
}

// Flush events periodically (every 30 seconds)
if (typeof window !== 'undefined') {
  // Flush on page unload
  window.addEventListener('beforeunload', () => {
    flushEvents();
  });
  
  // Flush on page visibility change (when user tabs back to the page)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && eventQueue.length > 0) {
      flushEvents();
    }
  });
  
  // Set up interval for periodic flushing
  setInterval(() => {
    if (eventQueue.length > 0) {
      flushEvents();
    }
  }, 30000); // 30 seconds
} 