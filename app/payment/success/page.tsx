"use client";

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

// The component that uses useSearchParams must be wrapped in Suspense
function SuccessContent() {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  
  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const sessionId = searchParams.get('session_id');
        
        // First check if the user already has access (webhook might have already processed)
        if (session?.user) {
          // Check user's subscription status directly
          const userStatusResponse = await fetch('/api/user/status');
          if (userStatusResponse.ok) {
            const userData = await userStatusResponse.json();
            if (userData.hasPaidAccess) {
              // User already has access, no need for further verification
              setIsSuccess(true);
              setIsVerifying(false);
              return;
            }
          }
        }
        
        // If no session ID or couldn't verify user status, and user doesn't have access yet
        if (!sessionId) {
          setIsVerifying(false);
          return;
        }
        
        // Try to verify through the session ID
        const response = await fetch(`/api/stripe/subscription?session_id=${sessionId}`);
        if (!response.ok) {
          throw new Error('Failed to verify payment');
        }
        
        const data = await response.json();
        setIsSuccess(data.success);
        
        // Even if the webhook hasn't processed yet, let's update the user's access rights
        // so they can start using the premium features immediately
        if (session?.user) {
          try {
            // First update the user's access in the database
            const updateResponse = await fetch('/api/user/update-access', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ hasPaidAccess: true }),
            });
            
            if (!updateResponse.ok) {
              throw new Error('Failed to update user access');
            }

            // Force a session refresh to update the UI
            await updateSession();
            
            // Double-check the session was updated
            const statusResponse = await fetch('/api/user/status');
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              if (!statusData.hasPaidAccess) {
                // If still not updated, try one more session refresh
                await updateSession();
              }
            }
            
            console.log("User session updated with premium access");
          } catch (error) {
            console.error("Failed to update user access:", error);
            toast.error("Your payment was successful, but there was an issue updating your access. Please try refreshing the page.");
          }
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to verify payment status');
        
        // Even if verification fails, check if the user has access in their session
        if (session?.user?.hasPaidAccess) {
          setIsSuccess(true);
        }
      } finally {
        setIsVerifying(false);
      }
    };
    
    verifyPayment();
  }, [searchParams, session, updateSession]);
  
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
    <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-lg shadow">
      {isSuccess ? (
        <>
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-4">
            Payment Successful!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
            Your one-time purchase was successful. You now have access to premium features.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-4">
            Payment Verification
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
            If you've already made a payment, please check your dashboard to access premium features. It may take a few moments for your payment to be processed.
          </p>
        </>
      )}
      
      <div className="flex flex-col space-y-4">
        <Link 
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Return to Home
        </Link>
        
        <Link
          href="/dashboard"
          className="text-center text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function LoadingFallback() {
  return (
    <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-lg shadow text-center">
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Loading...</h1>
    </div>
  );
}

// Main page component with Suspense wrapping
export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900 p-4">
      <Suspense fallback={<LoadingFallback />}>
        <SuccessContent />
      </Suspense>
    </div>
  );
} 