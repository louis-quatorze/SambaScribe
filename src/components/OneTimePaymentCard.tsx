"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { Check, Loader2 } from 'lucide-react';

interface OneTimePaymentCardProps {
  title: string;
  price: string;
  description: string;
  features: string[];
  productType: string;
}

export function OneTimePaymentCard({
  title,
  price,
  description,
  features,
  productType,
}: OneTimePaymentCardProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handlePayment = async () => {
    if (!session) {
      toast.info('Please sign in to continue');
      router.push('/auth/signin?callbackUrl=/pricing');
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productType,
          mode: 'payment', // Specify one-time payment mode
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
      console.error('Error processing payment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start payment process');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
        <p className="mt-4 text-gray-500 dark:text-gray-400">{description}</p>
        <p className="mt-8">
          <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{price}</span>
          <span className="text-base font-medium text-gray-500 dark:text-gray-400"> one-time</span>
        </p>
        <div className="mt-8">
          <button
            onClick={handlePayment}
            disabled={isLoading}
            className="w-full py-2 px-4 rounded-md shadow-sm text-center text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Buy Now'
            )}
          </button>
        </div>
      </div>
      <div className="px-6 pt-6 pb-8">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white tracking-wide uppercase">
          What's included
        </h3>
        <ul className="mt-6 space-y-4">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <div className="flex-shrink-0">
                <Check className="h-5 w-5 text-green-500" aria-hidden="true" />
              </div>
              <p className="ml-3 text-sm text-gray-700 dark:text-gray-300">{feature}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 