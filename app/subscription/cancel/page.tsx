"use client";

import Link from "next/link";
import { XCircle, ArrowLeft } from "lucide-react";

export default function SubscriptionCancelPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-white dark:bg-gray-900">
      <div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full">
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          
          <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
            Subscription Cancelled
          </h1>
          
          <p className="text-center text-gray-600 dark:text-gray-400">
            You've cancelled the subscription process. If you have any questions or need help, please contact our support team.
          </p>
          
          <div className="flex flex-col items-center justify-center space-y-4 w-full mt-6">
            <Link
              href="/pricing"
              className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              View Pricing Options
            </Link>
            
            <Link
              href="/"
              className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 