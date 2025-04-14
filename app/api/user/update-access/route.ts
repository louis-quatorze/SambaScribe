import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SubscriptionType } from "@/lib/services/stripe";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const { hasPaidAccess } = await request.json();
    
    // Update the user's access in the database
    await prisma.user.update({
      where: { id: userId },
      data: { 
        hasPaidAccess: hasPaidAccess === true,
        // Set subscription type to individual for one-time purchases
        subscriptionType: hasPaidAccess === true ? SubscriptionType.individual : null,
      }
    });
    
    // Respond with success
    return NextResponse.json({ 
      success: true,
      message: `User access updated: hasPaidAccess=${hasPaidAccess}` 
    });
  } catch (error) {
    console.error("Error updating user access:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new NextResponse(`Error: ${errorMessage}`, { status: 500 });
  }
} 