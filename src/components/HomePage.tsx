"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { PdfUpload } from "@/components/PdfUpload";
import { AiResults } from "@/components/AiResults";
import { SampleFiles } from "@/components/SampleFiles";
import { AiNotationData } from "@/lib/services/aiPdfProcessor";

export function HomePage() {
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

  return (
    <div className="min-h-screen flex flex-col relative">
      <main className="flex-1 flex flex-col w-full mx-auto">
        <div className="flex-1 flex flex-col items-start justify-center bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-950">
          <section className="max-w-7xl w-full space-y-8 animate-fade-in p-4">
            <Link href="/" className="block">
              <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                SambaScribe - AI Samba Notation Guide
              </h1>
            </Link>
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