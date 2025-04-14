import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    
    // Get the user from the database to check their actual status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        hasPaidAccess: true,
        subscriptionType: true,
        subscriptionStatus: true,
        subscriptions: {
          where: {
            status: {
              in: ['active', 'trialing']
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
          select: {
            id: true,
            status: true,
            currentPeriodEnd: true,
          }
        }
      }
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Get the subscription info
    const activeSubscription = user.subscriptions[0];
    
    return NextResponse.json({
      id: userId,
      hasPaidAccess: user.hasPaidAccess || false,
      subscriptionType: user.subscriptionType || null,
      subscriptionStatus: user.subscriptionStatus || null,
      subscription: activeSubscription || null,
      // Include the session data as well to help debugging
      sessionHasPaidAccess: session.user.hasPaidAccess || false,
    });
  } catch (error) {
    console.error("Error getting user status:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new NextResponse(`Error: ${errorMessage}`, { status: 500 });
  }
} 