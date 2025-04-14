"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import { Loader2, CreditCard, RefreshCw, AlertCircle } from 'lucide-react';
import { refreshSession } from '@/lib/utils/session';

interface Subscription {
  id: string;
  status: string;
  subscriptionType: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string;
}

interface SubscriptionResponse {
  subscription: Subscription | null;
  hasAccess: boolean;
}

export function SubscriptionManager() {
  const { data: session } = useSession();
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isManaging, setIsManaging] = useState<boolean>(false);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!session?.user) return;

      try {
        setIsLoading(true);
        const response = await fetch('/api/stripe/subscription');
        
        if (!response.ok) {
          throw new Error('Failed to fetch subscription data');
        }
        
        const data: SubscriptionResponse = await response.json();
        
        // If subscription status has changed, refresh the session
        if (data?.subscription?.status !== session.user.subscriptionStatus) {
          await refreshSession();
        }
        
        setSubscription(data.subscription);
        setHasAccess(data.hasAccess);
      } catch (error) {
        console.error('Error fetching subscription:', error);
        toast.error('Failed to load subscription information');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, [session]);

  const handleManageSubscription = async () => {
    if (!session?.user) {
      toast.info('Please sign in to manage your subscription');
      return;
    }

    try {
      setIsManaging(true);
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create customer portal session');
      }

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL provided');
      }
    } catch (error) {
      console.error('Error managing subscription:', error);
      toast.error('Failed to access subscription management portal');
    } finally {
      setIsManaging(false);
    }
  };

  const handleSubscribe = () => {
    router.push('/pricing');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Loading subscription information...</p>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Subscription</h2>
        
        <div className="flex items-start space-x-4 mb-6">
          <div className="flex-shrink-0">
            <CreditCard className="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No active subscription</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {hasAccess 
                ? "You have access to premium features through a one-time purchase."
                : "You're currently on the free plan with limited features."
              }
            </p>
          </div>
        </div>
        
        {!hasAccess && (
          <button
            onClick={handleSubscribe}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Upgrade to Premium
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Your Subscription</h2>
      
      <div className="flex items-start space-x-4 mb-6">
        <div className="flex-shrink-0">
          <CreditCard className="w-8 h-8 text-blue-500" />
        </div>
        <div className="flex-grow">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white capitalize">
              {subscription.subscriptionType === 'individual' ? 'Premium' : subscription.subscriptionType} Plan
            </h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
              subscription.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
              subscription.status === 'trialing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
              'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
            }`}>
              {subscription.status}
            </span>
          </div>
          
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {subscription.cancelAtPeriodEnd 
              ? subscription.stripeSubscriptionId.startsWith('one_time_')
                ? `One-time premium access valid until ${formatDate(subscription.currentPeriodEnd)}`
                : `Your subscription will end on ${formatDate(subscription.currentPeriodEnd)}`
              : `Next billing date: ${formatDate(subscription.currentPeriodEnd)}`
            }
          </p>
          
          {subscription.cancelAtPeriodEnd && !subscription.stripeSubscriptionId.startsWith('one_time_') && (
            <div className="mt-3 flex items-center text-sm text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4 mr-1" />
              <span>Your subscription has been canceled and will not renew</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Only show manage button for recurring subscriptions */}
      {!subscription.stripeSubscriptionId.startsWith('one_time_') && (
        <div className="space-y-3">
          <button
            onClick={handleManageSubscription}
            disabled={isManaging}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center"
          >
            {isManaging ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Manage Subscription
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
} 