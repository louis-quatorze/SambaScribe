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

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    // If session_id is provided, verify the payment session
    if (sessionId) {
      try {
        const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
        
        if (stripeSession.payment_status === 'paid') {
          // If the session is paid, ensure the user has access
          if (stripeSession.metadata?.userId) {
            const user = await prisma.user.findUnique({
              where: { id: stripeSession.metadata.userId },
              include: {
                subscriptions: {
                  where: {
                    status: 'active',
                  },
                  orderBy: {
                    createdAt: 'desc',
                  },
                  take: 1,
                },
              },
            });

            if (user) {
              // If user doesn't have paid access yet but payment is confirmed,
              // update their access
              if (!user.hasPaidAccess) {
                await prisma.user.update({
                  where: { id: user.id },
                  data: { 
                    hasPaidAccess: true,
                    subscriptionStatus: 'active',
                    subscriptionType: 'individual',
                  },
                });
              }

              return NextResponse.json({
                success: true,
                hasAccess: true,
                subscription: user.subscriptions[0] || null,
              });
            }
          }
        }
        
        // If we get here, something went wrong with the payment
        return NextResponse.json({
          success: false,
          message: 'Payment verification failed',
        });
      } catch (error) {
        console.error('Error verifying Stripe session:', error);
        return NextResponse.json({
          success: false,
          message: 'Failed to verify payment session',
        }, { status: 500 });
      }
    }

    // If no session_id, just return the user's current subscription status
    if (!session?.user) {
      return NextResponse.json({
        success: false,
        message: 'Not authenticated',
      }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        subscriptions: {
          where: {
            status: 'active',
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      hasAccess: user.hasPaidAccess || false,
      subscription: user.subscriptions[0] || null,
    });

  } catch (error) {
    console.error('Error in subscription endpoint:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
    }, { status: 500 });
  }
} 