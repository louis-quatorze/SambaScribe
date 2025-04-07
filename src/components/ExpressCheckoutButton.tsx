"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';

interface ExpressCheckoutButtonProps {
  buttonText?: string;
  className?: string;
}

export function ExpressCheckoutButton({
  buttonText = "Pay Now",
  className = "w-full py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center justify-center",
}: ExpressCheckoutButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleCheckout = async () => {
    if (!session) {
      toast.info('Please sign in to continue');
      router.push('/auth/signin?callbackUrl=/pricing');
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await fetch('/api/stripe/express-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
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
    <button
      onClick={handleCheckout}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        buttonText
      )}
    </button>
  );
} 