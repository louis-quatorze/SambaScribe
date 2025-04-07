"use client";

import Link from "next/link";
import { XCircle } from "lucide-react";

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md text-center">
        <div className="flex flex-col items-center justify-center">
          <XCircle className="h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Payment Cancelled
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your payment was cancelled. If you encountered any issues or have questions, please feel free to contact us.
          </p>
          <div className="space-y-4 w-full">
            <Link
              href="/pricing"
              className="block w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
            >
              Return to Pricing
            </Link>
            <Link
              href="/"
              className="block w-full py-2 px-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium rounded-md transition-colors"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 