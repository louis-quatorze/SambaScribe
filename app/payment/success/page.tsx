"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import { Loader2, Check } from 'lucide-react';
import Link from 'next/link';

function SuccessContent() {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const searchParams = useSearchParams();
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams?.get('session_id');
      if (!sessionId) {
        toast.error('No session ID found');
        setIsVerifying(false);
        return;
      }

      try {
        // First verify the payment with Stripe
        const response = await fetch(`/api/stripe/subscription?session_id=${sessionId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to verify payment status');
        }

        if (data.success && data.hasAccess) {
          setIsSuccess(true);
          
          // Force a session refresh to update the premium status
          await updateSession();
          
          // Double check the session was updated
          if (!session?.user?.hasPaidAccess && retryCount < 3) {
            console.log("Session not updated yet, retrying...", { retryCount });
            
            // Wait a moment and try again
            setTimeout(async () => {
              setRetryCount(prev => prev + 1);
              await updateSession();
              
              // If still not updated after retry, try the direct update
              if (!session?.user?.hasPaidAccess) {
                try {
                  const updateResponse = await fetch('/api/user/update-access', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ hasPaidAccess: true }),
                  });
                  
                  if (updateResponse.ok) {
                    await updateSession();
                    console.log("User access updated via fallback");
                  }
                } catch (updateError) {
                  console.error("Failed to update user access:", updateError);
                }
              }
            }, 2000);
          } else if (session?.user?.hasPaidAccess) {
            // Success! Redirect to home after a short delay
            setTimeout(() => {
              router.push('/');
            }, 2000);
          }
        } else {
          throw new Error(data.message || 'Payment verification failed');
        }
      } catch (error) {
        console.error('Verification error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to verify payment status');
        
        // Even if verification fails, check if the user has access in their session
        if (session?.user?.hasPaidAccess) {
          setIsSuccess(true);
        }
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams, session, updateSession, retryCount, router]);

  if (isVerifying) {
    return (
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-lg shadow text-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Verifying payment...</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Please wait while we verify your payment status.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-lg shadow text-center">
      {isSuccess ? (
        <>
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Payment Successful!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your one-time purchase was successful. You now have access to premium features.
            Redirecting you to the home page...
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Payment Verification Failed
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We couldn't verify your payment status. If you believe this is an error,
            please contact support with your session ID: {searchParams?.get('session_id')}
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Return to Pricing
          </Link>
        </>
      )}
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
      <SuccessContent />
    </div>
  );
} 