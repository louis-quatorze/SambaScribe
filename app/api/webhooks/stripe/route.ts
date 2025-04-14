import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { SubscriptionStatus } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return new NextResponse('No stripe-signature header found', { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new NextResponse('Webhook signature verification failed', { status: 400 });
    }

    console.log('Webhook event received:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (!session.metadata?.userId) {
          throw new Error('No user ID in session metadata');
        }

        const userId = session.metadata.userId;
        console.log(`Processing completed checkout for user ${userId}`);

        // Update user's access in database
        await prisma.user.update({
          where: { id: userId },
          data: { 
            hasPaidAccess: true,
            subscriptionStatus: SubscriptionStatus.active,
            subscriptionType: 'individual',
          },
        });

        // Create a subscription record for one-week access
        const now = new Date();
        const oneWeekFromNow = new Date(now);
        oneWeekFromNow.setDate(now.getDate() + 7);

        await prisma.subscription.create({
          data: {
            userId,
            stripeSubscriptionId: `one_time_${session.id}`,
            status: SubscriptionStatus.active,
            subscriptionType: 'individual',
            currentPeriodStart: now,
            currentPeriodEnd: oneWeekFromNow,
            cancelAtPeriodEnd: true,
          },
        });

        console.log(`Premium access granted to ${userId} until ${oneWeekFromNow.toISOString()}`);
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
        
        if (!stripeCustomer.metadata?.userId) {
          throw new Error('No user ID in customer metadata');
        }

        const userId = stripeCustomer.metadata.userId;
        const status = subscription.status === 'active' || subscription.status === 'trialing' 
          ? SubscriptionStatus.active 
          : SubscriptionStatus.canceled;

        // Update subscription status in database
        await prisma.user.update({
          where: { id: userId },
          data: {
            hasPaidAccess: subscription.status === 'active' || subscription.status === 'trialing',
            subscriptionStatus: status,
          },
        });

        break;
      }
    }

    return new NextResponse('Webhook processed successfully', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new NextResponse('Webhook error', { status: 500 });
  }
} 