import { prisma } from "@/lib/db";
import type { AnalyticsEvent } from "@/lib/analytics";

/**
 * Logs an analytics event to the database
 */
export async function logEventToDatabase(
  event: AnalyticsEvent,
  userId?: string,
  userEmail?: string,
  clientIp?: string,
  userAgent?: string
) {
  try {
    await prisma.analyticsEvent.create({
      data: {
        type: event.type,
        target: event.target,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
        userId,
        userEmail,
        timestamp: new Date(event.timestamp),
        clientIp,
        userAgent,
      },
    });
    console.log(`[DB Logger] Stored event in database: ${event.type} - ${event.target}`);
    return true;
  } catch (error) {
    console.error("[DB Logger] Failed to store event in database:", error);
    return false;
  }
}

/**
 * Retrieves analytics events from the database with optional filtering
 */
export async function getAnalyticsEvents({
  type,
  target,
  userId,
  startDate,
  endDate,
  limit = 100,
  offset = 0,
}: {
  type?: string;
  target?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};
  
  if (type) where.type = type;
  if (target) where.target = target;
  if (userId) where.userId = userId;
  
  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = startDate;
    if (endDate) where.timestamp.lte = endDate;
  }
  
  return await prisma.analyticsEvent.findMany({
    where,
    orderBy: {
      timestamp: 'desc',
    },
    take: limit,
    skip: offset,
  });
}

/**
 * Gets a count of events by type
 */
export async function getEventCountsByType(
  startDate?: Date,
  endDate?: Date
) {
  // Build timestamp conditions
  const where: any = {};
  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = startDate;
    if (endDate) where.timestamp.lte = endDate;
  }
  
  // Get all events matching the time criteria
  const events = await prisma.analyticsEvent.findMany({
    where,
    select: {
      type: true,
    },
  });
  
  // Count events by type
  const counts: Record<string, number> = {};
  events.forEach(event => {
    counts[event.type] = (counts[event.type] || 0) + 1;
  });
  
  return counts;
} 