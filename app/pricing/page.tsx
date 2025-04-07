"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { Check, Loader2 } from 'lucide-react';
import { OneTimePaymentCard } from '@/components/OneTimePaymentCard';

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSubscribe = async (subscriptionType: string) => {
    if (!session) {
      toast.info('Please sign in to subscribe');
      router.push('/auth/signin?callbackUrl=/pricing');
      return;
    }

    try {
      setIsLoading(subscriptionType);
      
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionType,
          mode: 'subscription',
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to create checkout session');
      }

      const data = await response.json();
      
      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL provided');
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start subscription process');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
            Pricing Plans
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-400">
            Choose the perfect plan for your samba notation needs
          </p>
        </div>

        {/* Subscription Plans */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Subscription Plans
          </h2>
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-x-10">
            {/* Free Plan */}
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Free</h2>
                <p className="mt-4 text-gray-500 dark:text-gray-400">Basic features for casual users</p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">$0</span>
                  <span className="text-base font-medium text-gray-500 dark:text-gray-400">/month</span>
                </p>
                <div className="mt-8">
                  <Link
                    href="/"
                    className="block w-full py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-center text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Get Started for Free
                  </Link>
                </div>
              </div>
              <div className="px-6 pt-6 pb-8">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white tracking-wide uppercase">
                  What's included
                </h3>
                <ul className="mt-6 space-y-4">
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <Check className="h-5 w-5 text-green-500" aria-hidden="true" />
                    </div>
                    <p className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                      Basic rhythm analysis
                    </p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <Check className="h-5 w-5 text-green-500" aria-hidden="true" />
                    </div>
                    <p className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                      Simple mnemonic generation
                    </p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <Check className="h-5 w-5 text-green-500" aria-hidden="true" />
                    </div>
                    <p className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                      Sample file analysis
                    </p>
                  </li>
                </ul>
              </div>
            </div>

            {/* Individual Plan */}
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden border-2 border-blue-500 dark:border-blue-400 relative">
              <div className="absolute top-0 w-full bg-blue-500 text-white text-center py-1 text-sm font-medium">
                Premium
              </div>
              <div className="p-6 pt-10">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Individual</h2>
                <p className="mt-4 text-gray-500 dark:text-gray-400">Advanced features for dedicated percussionists</p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">$9.99</span>
                  <span className="text-base font-medium text-gray-500 dark:text-gray-400">/month</span>
                </p>
                <div className="mt-8">
                  <button
                    onClick={() => handleSubscribe('individual')}
                    disabled={isLoading === 'individual'}
                    className="w-full py-2 px-4 rounded-md shadow-sm text-center text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center"
                  >
                    {isLoading === 'individual' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Subscribe Now'
                    )}
                  </button>
                </div>
              </div>
              <div className="px-6 pt-6 pb-8">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white tracking-wide uppercase">
                  What's included
                </h3>
                <ul className="mt-6 space-y-4">
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <Check className="h-5 w-5 text-green-500" aria-hidden="true" />
                    </div>
                    <p className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                      Everything in Free
                    </p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <Check className="h-5 w-5 text-green-500" aria-hidden="true" />
                    </div>
                    <p className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                      Advanced rhythm analysis and pattern recognition
                    </p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <Check className="h-5 w-5 text-green-500" aria-hidden="true" />
                    </div>
                    <p className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                      Upload your own PDF sheets
                    </p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <Check className="h-5 w-5 text-green-500" aria-hidden="true" />
                    </div>
                    <p className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                      Advanced mnemonic customization
                    </p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <Check className="h-5 w-5 text-green-500" aria-hidden="true" />
                    </div>
                    <p className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                      Priority support
                    </p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <Check className="h-5 w-5 text-green-500" aria-hidden="true" />
                    </div>
                    <p className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                      Teaching materials and lesson tools
                    </p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <Check className="h-5 w-5 text-green-500" aria-hidden="true" />
                    </div>
                    <p className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                      Visual rhythm representations
                    </p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* One-time Payment Options */}
        <div className="mt-24">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            One-time Payment Options
          </h2>
          <div className="grid gap-8 lg:grid-cols-1 lg:gap-x-10 max-w-2xl mx-auto">
            <OneTimePaymentCard
              title="PDF Upload Access"
              price="$4.99"
              description="One-time payment for the ability to upload your own PDF sheet music"
              productType="pdf_upload"
              features={[
                "Upload your own Samba notation PDF files",
                "Get AI-generated mnemonics for your own sheets",
                "Lifetime access to PDF upload feature",
                "Works with standard Western notation",
                "Unlimited number of uploads"
              ]}
            />
          </div>
        </div>

        <div className="mt-12 max-w-3xl mx-auto text-center">
          <p className="text-base text-gray-500 dark:text-gray-400">
            Need a custom solution for your organization?{' '}
            <a href="mailto:contact@sambascribe.com" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
              Contact us
            </a>{' '}
            for custom pricing options.
          </p>
          
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Looking for a quicker checkout? Try our{' '}
            <Link href="/express-checkout" className="font-medium text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300">
              express checkout
            </Link>{' '}
            for a simple one-click payment process.
          </p>
        </div>
      </div>
    </div>
  );
} 