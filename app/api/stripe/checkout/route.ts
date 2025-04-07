import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createCheckoutSession } from "@/lib/services/stripe";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { subscriptionType } = body;

    if (!subscriptionType) {
      return new NextResponse("Subscription type is required", { status: 400 });
    }

    const userId = session.user.id;
    const checkoutSession = await createCheckoutSession(userId, subscriptionType);

    return NextResponse.json({ 
      url: checkoutSession.url 
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new NextResponse(`Error: ${errorMessage}`, { status: 500 });
  }
} 