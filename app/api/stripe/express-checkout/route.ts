import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { createStripeCustomer } from "@/lib/services/stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not defined");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-03-31.basil",
});

export async function POST(request: Request) {
  try {
    // Get the authenticated user
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    
    // Get or create the Stripe customer for this user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { stripeCustomer: true }
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Get or create Stripe customer
    let stripeCustomerId;
    if (user.stripeCustomer) {
      stripeCustomerId = user.stripeCustomer.stripeCustomerId;
    } else if (user.email) {
      const customer = await createStripeCustomer(userId, user.email, user.name || undefined);
      stripeCustomerId = customer.stripeCustomerId;
    } else {
      return new NextResponse("User has no email address", { status: 400 });
    }

    // Create Express-style checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price: 'price_1RBP2MFzhLUFKVrLsO4pmU6e', // PDF upload price ID
        quantity: 1
      }],
      success_url: `${process.env.NEXTAUTH_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/payment/cancel`,
      metadata: {
        userId: userId,
        productType: 'pdf_upload',
      },
    });

    // Return the checkout URL
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new NextResponse(`Error: ${errorMessage}`, { status: 500 });
  }
} 