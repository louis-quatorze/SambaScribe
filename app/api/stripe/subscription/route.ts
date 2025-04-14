import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { getUserSubscription } from "@/lib/services/stripe";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-03-31.basil",
});

export async function GET(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for session_id in query params for manual verification
    const url = new URL(request.url);
    const checkoutSessionId = url.searchParams.get('session_id');
    
    if (checkoutSessionId) {
      // Verify the checkout session
      const checkoutSession = await stripe.checkout.sessions.retrieve(checkoutSessionId);
      
      if (checkoutSession.payment_status === 'paid' && checkoutSession.metadata?.userId === session.user.id) {
        // Manually update user access
        const { prisma } = await import('@/lib/db');
        await prisma.user.update({
          where: { id: session.user.id },
          data: { hasPaidAccess: true }
        });
        
        if (checkoutSession.mode === 'payment' && checkoutSession.metadata?.productType === 'premium_weekly') {
          const now = new Date();
          const oneWeekFromNow = new Date(now);
          oneWeekFromNow.setDate(now.getDate() + 7);
          
          await prisma.subscription.create({
            data: {
              userId: session.user.id,
              stripeSubscriptionId: `one_time_${checkoutSession.id}`,
              status: 'active',
              subscriptionType: 'individual',
              currentPeriodStart: now,
              currentPeriodEnd: oneWeekFromNow,
              cancelAtPeriodEnd: true,
            },
          });
        }
      }
    }

    const subscription = await getUserSubscription(session.user.id);
    
    // Get the user's current access status
    const { prisma } = await import('@/lib/db');
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { hasPaidAccess: true }
    });

    return NextResponse.json({ 
      subscription,
      hasAccess: user?.hasPaidAccess || false
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
} 