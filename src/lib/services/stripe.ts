import Stripe from 'stripe';
import { prisma } from '@/lib/db';

// Define the subscription types and status enums
export enum SubscriptionType {
  free = 'free',
  individual = 'individual'
}

export enum SubscriptionStatus {
  active = 'active',
  past_due = 'past_due',
  canceled = 'canceled',
  incomplete = 'incomplete',
  incomplete_expired = 'incomplete_expired',
  unpaid = 'unpaid',
  trialing = 'trialing'
}

// Define a type for the Stripe subscription data we need
interface StripeSubscriptionData {
  id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  items: {
    data: Array<{
      price: {
        product: string | {
          id: string;
          metadata: {
            subscriptionType?: string;
          };
        };
      };
    }>;
  };
}

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-03-31.basil',
});

// Price IDs for different subscription types
const SUBSCRIPTION_PRICES = {
  individual: 'price_individual', // Replace with actual Stripe price IDs
};

// Price IDs for one-time payments
const ONE_TIME_PRICES = {
  pdf_upload: 'price_1RBP2MFzhLUFKVrLsO4pmU6e', // Stripe price ID for one-time PDF upload
};

export async function createStripeCustomer(userId: string, email: string, name?: string) {
  try {
    // Check if customer already exists
    const existingCustomer = await prisma.stripeCustomer.findUnique({
      where: { userId },
    });

    if (existingCustomer) {
      return existingCustomer;
    }

    // Create new customer in Stripe
    const customer = await stripe.customers.create({
      email,
      name: name || undefined,
      metadata: {
        userId,
      },
    });

    // Save customer in database
    return prisma.stripeCustomer.create({
      data: {
        userId,
        stripeCustomerId: customer.id,
      },
    });
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
}

export async function createCheckoutSession(userId: string, subscriptionType: string) {
  try {
    // Get or create customer
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        stripeCustomer: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    let stripeCustomerId;

    if (user.stripeCustomer) {
      stripeCustomerId = user.stripeCustomer.stripeCustomerId;
    } else if (user.email) {
      const customer = await createStripeCustomer(userId, user.email, user.name || undefined);
      stripeCustomerId = customer.stripeCustomerId;
    } else {
      throw new Error('User has no email address');
    }

    // Get price ID based on subscription type
    const priceId = SUBSCRIPTION_PRICES[subscriptionType.toLowerCase() as keyof typeof SUBSCRIPTION_PRICES];
    
    if (!priceId) {
      throw new Error(`Invalid subscription type: ${subscriptionType}`);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXTAUTH_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/subscription/cancel`,
      metadata: {
        userId,
        subscriptionType,
      },
    });

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

export async function createCustomerPortalSession(userId: string) {
  try {
    const customer = await prisma.stripeCustomer.findUnique({
      where: { userId },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Create customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL}/dashboard`,
    });

    return session;
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    throw error;
  }
}

export async function createOneTimeCheckoutSession(userId: string, productType: string, userEmail?: string, userName?: string) {
  try {
    // Get or create customer
    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        stripeCustomer: true
      }
    });

    // If user doesn't exist in the database but we have their info from the auth session
    if (!user && userEmail) {
      // Create the user in the database
      user = await prisma.user.create({
        data: {
          id: userId,
          email: userEmail,
          name: userName || null,
          role: 'user',
          isAdmin: false,
          hasPaidAccess: false,
        },
        include: {
          stripeCustomer: true
        }
      });
      console.log(`Created new user in database: ${userId}`);
    }

    if (!user) {
      throw new Error('User not found and could not be created');
    }

    let stripeCustomerId;

    if (user.stripeCustomer) {
      stripeCustomerId = user.stripeCustomer.stripeCustomerId;
    } else if (user.email) {
      const customer = await createStripeCustomer(userId, user.email, user.name || undefined);
      stripeCustomerId = customer.stripeCustomerId;
    } else {
      throw new Error('User has no email address');
    }

    // Get price ID based on product type
    const priceId = ONE_TIME_PRICES[productType.toLowerCase() as keyof typeof ONE_TIME_PRICES];
    
    if (!priceId) {
      throw new Error(`Invalid product type: ${productType}`);
    }

    // Create checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment', // One-time payment mode
      success_url: `${process.env.NEXTAUTH_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/payment/cancel`,
      metadata: {
        userId,
        productType,
      },
    });

    return session;
  } catch (error) {
    console.error('Error creating one-time checkout session:', error);
    throw error;
  }
}

// Update local database with subscription information from Stripe
export async function updateSubscriptionInDatabase(
  stripeSubscriptionId: string,
  status: string,
  userId: string,
  subscriptionType: string,
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  cancelAtPeriodEnd: boolean = false
) {
  try {
    // Check if subscription exists
    const existingSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId },
    });

    // Update user's subscription status
    await prisma.user.update({
      where: { id: userId },
      data: { 
        hasPaidAccess: status === SubscriptionStatus.active || status === SubscriptionStatus.trialing,
        subscriptionStatus: status as any,
        subscriptionType: subscriptionType as any
      },
    });

    if (existingSubscription) {
      // Update existing subscription
      return prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: status as any,
          cancelAtPeriodEnd,
          currentPeriodStart,
          currentPeriodEnd,
          subscriptionType: subscriptionType as any,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new subscription
      return prisma.subscription.create({
        data: {
          userId,
          stripeSubscriptionId,
          status: status as any,
          subscriptionType: subscriptionType as any,
          currentPeriodStart,
          currentPeriodEnd,
          cancelAtPeriodEnd,
        },
      });
    }
  } catch (error) {
    console.error('Error updating subscription in database:', error);
    throw error;
  }
}

// Webhook handler to process Stripe events
export async function handleStripeWebhook(event: Stripe.Event) {
  const { type, data } = event;

  try {
    switch (type) {
      case 'checkout.session.completed': {
        const session = data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription' && session.metadata?.userId && session.subscription) {
          // Handle subscription checkout
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string) as unknown as StripeSubscriptionData;
          const subscriptionType = session.metadata.subscriptionType;
          
          const periodStart = new Date(subscription.current_period_start * 1000);
          const periodEnd = new Date(subscription.current_period_end * 1000);
          
          await updateSubscriptionInDatabase(
            subscription.id,
            subscription.status,
            session.metadata.userId,
            subscriptionType,
            periodStart,
            periodEnd,
            subscription.cancel_at_period_end
          );
        } else if (session.mode === 'payment' && session.metadata?.userId) {
          // Handle one-time payment
          // Grant user access to the specific paid feature
          const userId = session.metadata.userId;
          const productType = session.metadata.productType;
          
          if (productType === 'pdf_upload') {
            // Update user to give them access to PDF upload feature
            await prisma.user.update({
              where: { id: userId },
              data: { 
                hasPaidAccess: true,
              },
            });
          }
          
          // You could record the purchase in a separate table if needed
          // This could be implemented later
        }
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = data.object as Stripe.Invoice;
        
        if (invoice.subscription && invoice.customer) {
          // Cast the response to our custom type
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription) as unknown as StripeSubscriptionData;
          
          // Find user by Stripe customer ID
          const customer = await prisma.stripeCustomer.findUnique({
            where: { stripeCustomerId: invoice.customer as string },
          });
          
          if (customer) {
            // Cast the response to our custom type
            const subscriptionData = await stripe.subscriptions.retrieve(invoice.subscription) as unknown as StripeSubscriptionData;
            
            // Get the timestamps using the Subscription data object structure
            const periodStart = new Date(subscriptionData.current_period_start * 1000);
            const periodEnd = new Date(subscriptionData.current_period_end * 1000);
            
            // Get the subscription type from the product
            const items = subscriptionData.items.data;
            let subscriptionType = SubscriptionType.individual; // Default
            
            if (items.length > 0 && items[0].price.product) {
              const productId = typeof items[0].price.product === 'string' ? 
                items[0].price.product : items[0].price.product.id;
              
              const product = await stripe.products.retrieve(productId);
              
              if (product.metadata.subscriptionType) {
                subscriptionType = product.metadata.subscriptionType as SubscriptionType;
              }
            }
            
            await updateSubscriptionInDatabase(
              subscription.id,
              subscription.status,
              customer.userId,
              subscriptionType,
              periodStart,
              periodEnd,
              subscription.cancel_at_period_end
            );
          }
        }
        break;
      }
      case 'customer.subscription.updated': {
        // Cast the response to our custom type
        const subscription = data.object as unknown as StripeSubscriptionData;
        
        // Find customer by Stripe subscription ID
        const existingSubscription = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        });
        
        if (existingSubscription) {
          // Get the timestamps using the Subscription data object structure
          const periodStart = new Date(subscription.current_period_start * 1000);
          const periodEnd = new Date(subscription.current_period_end * 1000);
          
          await updateSubscriptionInDatabase(
            subscription.id,
            subscription.status,
            existingSubscription.userId,
            existingSubscription.subscriptionType,
            periodStart,
            periodEnd,
            subscription.cancel_at_period_end
          );
        }
        break;
      }
      case 'customer.subscription.deleted': {
        // Cast the response to our custom type
        const subscription = data.object as unknown as StripeSubscriptionData;
        
        // Find subscription by Stripe subscription ID
        const existingSubscription = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        });
        
        if (existingSubscription) {
          // Update subscription status
          await updateSubscriptionInDatabase(
            subscription.id,
            SubscriptionStatus.canceled,
            existingSubscription.userId,
            existingSubscription.subscriptionType,
            existingSubscription.currentPeriodStart,
            existingSubscription.currentPeriodEnd,
            true
          );
          
          // Update user's subscription status
          await prisma.user.update({
            where: { id: existingSubscription.userId },
            data: { 
              hasPaidAccess: false,
              subscriptionStatus: SubscriptionStatus.canceled as any,
            },
          });
        }
        break;
      }
    }
  } catch (error) {
    console.error('Error handling webhook:', error);
    throw error;
  }
}

// Get subscription for a user
export async function getUserSubscription(userId: string) {
  try {
    return prisma.subscription.findFirst({
      where: { 
        userId,
        status: {
          in: [SubscriptionStatus.active, SubscriptionStatus.trialing] as any[]
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  } catch (error) {
    console.error('Error getting user subscription:', error);
    throw error;
  }
}

// Cancel a subscription
export async function cancelSubscription(subscriptionId: string) {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Cancel the subscription in Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Update the subscription in the database
    return prisma.subscription.update({
      where: { id: subscriptionId },
      data: { cancelAtPeriodEnd: true },
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

// Check if a user can access paid features
export async function canAccessPaidFeatures(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    return !!user?.hasPaidAccess;
  } catch (error) {
    console.error('Error checking paid access:', error);
    return false;
  }
} 