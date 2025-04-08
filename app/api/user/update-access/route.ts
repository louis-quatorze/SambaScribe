import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SubscriptionStatus, SubscriptionType } from "@/lib/services/stripe";

export async function POST(request: Request) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { hasPaidAccess } = body;

    if (hasPaidAccess === undefined) {
      return new NextResponse("Missing hasPaidAccess field", { status: 400 });
    }

    console.log(`Directly updating user ${userId} hasPaidAccess=${hasPaidAccess}`);

    // Update the user's paid access status
    await prisma.user.update({
      where: { id: userId },
      data: { 
        hasPaidAccess,
        subscriptionStatus: hasPaidAccess ? SubscriptionStatus.active : undefined,
        subscriptionType: hasPaidAccess ? SubscriptionType.individual : undefined,
      },
    });

    // If setting the user to paid, also ensure there's a subscription record
    if (hasPaidAccess) {
      const now = new Date();
      const oneWeekFromNow = new Date(now);
      oneWeekFromNow.setDate(now.getDate() + 7);
      
      // Check if a subscription record already exists
      const existingSubscription = await prisma.subscription.findFirst({
        where: { 
          userId,
          status: SubscriptionStatus.active,
        },
      });
      
      if (!existingSubscription) {
        // Create a subscription record with an end date of one week from now
        await prisma.subscription.create({
          data: {
            userId,
            stripeSubscriptionId: `direct_${Date.now()}`, // Generate a unique ID
            status: SubscriptionStatus.active,
            subscriptionType: SubscriptionType.individual,
            currentPeriodStart: now,
            currentPeriodEnd: oneWeekFromNow,
            cancelAtPeriodEnd: true,
          },
        });
        
        console.log(`Created direct subscription for ${userId} until ${oneWeekFromNow.toISOString()}`);
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `User access updated successfully. hasPaidAccess=${hasPaidAccess}`
    });
  } catch (error) {
    console.error("Error updating user access:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new NextResponse(`Error: ${errorMessage}`, { status: 500 });
  }
} 