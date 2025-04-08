"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { PdfUpload } from "@/components/PdfUpload";
import { AiResults } from "@/components/AiResults";
import { SampleFiles } from "@/components/SampleFiles";
import { Header } from "@/components/Header";
import { AiNotationData } from "@/lib/services/aiPdfProcessor";
import { toast } from "react-toastify";
import { LockIcon } from "lucide-react";
import Link from "next/link";

export function HomePage() {
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
    console.log("HomePage received AI data:", data);
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

    console.log("Setting aiResults with:", validData);
    setAiResults(validData);
  };

  // Scroll to results when they become available
  useEffect(() => {
    if (aiResults && resultsRef.current) {
      console.log("Scrolling to results");
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [aiResults]);

  // Debug log when component mounts or aiResults changes
  useEffect(() => {
    console.log("HomePage aiResults state:", aiResults);
  }, [aiResults]);

  // Debug log for session status
  useEffect(() => {
    console.log("Auth session status:", status, session);
  }, [status, session]);

  return (
    <div className="min-h-screen flex flex-col relative bg-white dark:bg-gray-900">
      <Header />
      
      <main className="flex-1 flex flex-col w-full mx-auto">
        <div className="flex-1 flex flex-col items-start justify-center">
          <section className="max-w-7xl w-full space-y-8 animate-fade-in p-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
              AI Samba Notation Guide
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-400">
              Upload a samba notation file for AI-powered analysis and mnemonic generation
            </p>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
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
              <div>
                <SampleFiles onProcessComplete={handleProcessComplete} />
              </div>
            </div>
            
            {aiResults && (
              <div ref={resultsRef} className="w-full transition-all duration-300 animate-fade-in">
                <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-4">
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