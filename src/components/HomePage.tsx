"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { PdfUpload } from "@/components/PdfUpload";
import { AiResults } from "@/components/AiResults";
import { SampleFiles } from "@/components/SampleFiles";
import { AiNotationData } from "@/lib/services/aiPdfProcessor";
import { LogIn, LogOut, User } from "lucide-react";

export function HomePage() {
  const { data: session, status } = useSession();
  const [aiResults, setAiResults] = useState<AiNotationData | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

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

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-white dark:bg-gray-900">
      <header className="w-full flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800">
        <Link href="/" className="block">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            SambaScribe
          </h1>
        </Link>

        <div className="flex items-center gap-4">
          {status === "authenticated" && session?.user ? (
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/pricing"
                className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Pricing
              </Link>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <User className="h-4 w-4" />
                <span>{session.user.name || session.user.email}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href="/pricing"
                className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Pricing
              </Link>
              <Link 
                href="/auth/signin" 
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            </div>
          )}
        </div>
      </header>
      
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
                <PdfUpload onProcessComplete={handleProcessComplete} />
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