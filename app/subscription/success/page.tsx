"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import { Check, ArrowLeft } from "lucide-react";

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifySubscription = async () => {
      if (!sessionId) {
        toast.error("No session ID provided");
        router.push("/");
        return;
      }

      try {
        setIsLoading(true);
        // Wait for a moment to ensure the webhook has processed
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // In a real implementation, you might want to verify the subscription status
        // by making an API call to your backend
        
        toast.success("Subscription completed successfully");
      } catch (error) {
        console.error("Error verifying subscription:", error);
        toast.error("Failed to verify subscription");
      } finally {
        setIsLoading(false);
      }
    };

    verifySubscription();
  }, [sessionId, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-white dark:bg-gray-900">
      <div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full">
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          
          <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
            Subscription Successful!
          </h1>
          
          <p className="text-center text-gray-600 dark:text-gray-400">
            Thank you for subscribing to SambaScribe. Your account has been successfully upgraded and you now have access to all premium features.
          </p>
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center mt-6">
              <div className="w-8 h-8 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Finalizing your subscription...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4 w-full mt-6">
              <Link
                href="/dashboard"
                className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Go to Dashboard
              </Link>
              
              <Link
                href="/"
                className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Home
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 