import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createCheckoutSession, createOneTimeCheckoutSession } from "@/lib/services/stripe";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email || undefined;
    const userName = session.user.name || undefined;
    
    // Use the one-time payment for premium_weekly instead of subscription
    const checkoutSession = await createOneTimeCheckoutSession(
      userId, 
      'premium_weekly',
      userEmail,
      userName
    );

    if (!checkoutSession.url) {
      return new NextResponse("Failed to generate checkout URL", { status: 500 });
    }

    return NextResponse.redirect(checkoutSession.url);
  } catch (error) {
    console.error("Error creating checkout session:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new NextResponse(`Error: ${errorMessage}`, { status: 500 });
  }
}

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
    const userEmail = session.user.email || undefined;
    const userName = session.user.name || undefined;
    
    if (mode === 'payment' && !userEmail) {
      return new NextResponse("User email is required for payment", { status: 400 });
    }
    
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
      checkoutSession = await createOneTimeCheckoutSession(userId, productType, userEmail, userName);
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