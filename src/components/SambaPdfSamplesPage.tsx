"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { PdfUpload } from "@/components/PdfUpload";
import { AiResults } from "@/components/AiResults";
import { SampleFiles } from "@/components/SampleFiles";
import { Header } from "@/components/Header";
import { SubscriptionManager } from "@/components/SubscriptionManager";
import { AiNotationData } from "@/lib/services/aiPdfProcessor";
import { LockIcon, FileText, Music } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-toastify";

export function SambaPdfSamplesPage() {
  const { data: session, status } = useSession();
  const [aiResults, setAiResults] = useState<AiNotationData | null>(null);
  const [hasSubscription, setHasSubscription] = useState<boolean>(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Fetch subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (status !== "authenticated" || !session?.user) return;
      
      try {
        setIsCheckingSubscription(true);
        const response = await fetch('/api/stripe/subscription');
        
        if (!response.ok) {
          throw new Error('Failed to fetch subscription data');
        }
        
        const data = await response.json();
        setHasSubscription(data.hasAccess);
      } catch (error) {
        console.error('Error fetching subscription:', error);
        setHasSubscription(false);
      } finally {
        setIsCheckingSubscription(false);
      }
    };

    checkSubscription();
  }, [session, status]);

  const handleProcessComplete = (data: AiNotationData) => {
    if (!data || typeof data !== 'object') {
      console.error("Invalid data received in handleProcessComplete", data);
      return;
    }

    // Ensure we have a valid data structure
    const validData: AiNotationData = {
      filename: typeof data.filename === 'string' ? data.filename : 'unknown-file',
      aiSummary: typeof data.aiSummary === 'string' ? data.aiSummary : 'No summary available',
      mnemonics: Array.isArray(data.mnemonics) ? data.mnemonics : []
    };

    setAiResults(validData);
    
    // Scroll to results when they become available
    if (resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-white dark:bg-gray-900">
      <Header />
      
      <main className="flex-1 flex flex-col w-full mx-auto">
        <div className="flex-1 flex flex-col items-center justify-center">
          <section className="max-w-7xl w-full space-y-8 animate-fade-in p-4 md:p-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Samba PDF Analyzer
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
                Analyze samba notation PDFs with AI-powered insights and vocal mnemonics
              </p>
            </div>

            {/* Illustration Section */}
            <div className="relative h-64 w-full rounded-xl overflow-hidden mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 opacity-80"></div>
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <div className="flex items-center space-x-4">
                  <FileText className="w-16 h-16 text-white" />
                  <div className="text-white text-3xl font-bold">→</div>
                  <Music className="w-16 h-16 text-white" />
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* Sample PDFs Section */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Sample PDFs
                </h2>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Select one of our sample samba notation PDFs
                  </p>
                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full">
                    Powered by Claude 3.5 Sonnet
                  </span>
                </div>
                <SampleFiles onProcessComplete={handleProcessComplete} />
              </div>

              {/* Upload PDF Section */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Upload Your PDF
                </h2>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Upload your own samba notation PDF
                  </p>
                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full">
                    Powered by Claude 3.5 Sonnet
                  </span>
                </div>
                {hasSubscription || !session ? (
                  <PdfUpload onProcessComplete={handleProcessComplete} />
                ) : (
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center bg-gray-50 dark:bg-gray-800/30">
                    <LockIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Premium Feature</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Uploading your own files requires a premium subscription
                    </p>
                    <Link 
                      href="/pricing" 
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Upgrade to Premium
                    </Link>
                  </div>
                )}
              </div>
            </div>
            
            {status === "authenticated" && (
              <div className="w-full mt-8 mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Your Subscription
                </h2>
                <SubscriptionManager />
              </div>
            )}
            
            {aiResults && (
              <div ref={resultsRef} className="w-full transition-all duration-300 animate-fade-in mt-8">
                <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-6">
                  AI Analysis Results
                </h2>
                <AiResults data={aiResults} />
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
} 