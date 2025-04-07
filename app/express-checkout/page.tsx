"use client";

import { ExpressCheckoutButton } from "@/components/ExpressCheckoutButton";

export default function ExpressCheckoutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Quick PDF Upload Access
        </h1>
        
        <div className="mb-8">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Get unlimited access to upload your own PDF files for Samba notation analysis.
          </p>
          
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            $4.99
          </p>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            One-time payment, lifetime access
          </p>
        </div>
        
        <div className="space-y-2">
          <ExpressCheckoutButton 
            buttonText="Buy Now ($4.99)" 
            className="w-full py-3 px-4 rounded-md shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center justify-center"
          />
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
            Secure payment powered by Stripe
          </p>
        </div>
      </div>
    </div>
  );
} 