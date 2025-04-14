import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { handleStripeWebhook } from '@/lib/services/stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  console.log("Stripe webhook received");
  
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set. Please check your environment variables.");
    return new NextResponse('Webhook secret is not set', { status: 500 });
  }

  try {
    const body = await request.text();
    console.log("Webhook request body received");
    
    const signature = request.headers.get('stripe-signature') as string;
    if (!signature) {
      console.error("No stripe-signature header found");
      return new NextResponse('No stripe-signature header found', { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-03-31.basil',
    });

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log(`Webhook event received: ${event.type}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Webhook signature verification failed: ${errorMessage}`);
      return new NextResponse(`Webhook Error: ${errorMessage}`, { status: 400 });
    }

    // Handle the event
    console.log(`Processing webhook event: ${event.type}`);
    await handleStripeWebhook(event);
    console.log(`Webhook event processed: ${event.type}`);

    return new NextResponse(JSON.stringify({ received: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Webhook error: ${errorMessage}`);
    return new NextResponse(`Webhook Error: ${errorMessage}`, { status: 500 });
  }
} 