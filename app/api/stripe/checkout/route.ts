import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createCheckoutSession, createOneTimeCheckoutSession } from "@/lib/services/stripe";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { subscriptionType, productType, mode } = body;

    if (!mode) {
      return new NextResponse("Payment mode is required", { status: 400 });
    }

    const userId = session.user.id;
    let checkoutSession;

    if (mode === 'subscription') {
      if (!subscriptionType) {
        return new NextResponse("Subscription type is required", { status: 400 });
      }
      checkoutSession = await createCheckoutSession(userId, subscriptionType);
    } else if (mode === 'payment') {
      if (!productType) {
        return new NextResponse("Product type is required", { status: 400 });
      }
      checkoutSession = await createOneTimeCheckoutSession(userId, productType);
    } else {
      return new NextResponse("Invalid payment mode", { status: 400 });
    }

    return NextResponse.json({ 
      url: checkoutSession.url 
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new NextResponse(`Error: ${errorMessage}`, { status: 500 });
  }
} 