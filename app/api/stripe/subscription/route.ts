import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-03-31.basil",
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: {
          in: ["active", "trialing"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get the user's paid access status
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { hasPaidAccess: true }
    });

    if (!subscription) {
      return NextResponse.json({
        subscription: null,
        hasAccess: user?.hasPaidAccess || false
      });
    }

    return NextResponse.json({
      subscription: {
        ...subscription,
        currentPeriodStart: subscription.currentPeriodStart.toISOString(),
        currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      },
      hasAccess: user?.hasPaidAccess || false
    });
  } catch (error) {
    console.error("Error getting subscription:", error);
    return new NextResponse(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
} 