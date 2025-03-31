"use client";

import { useState, useRef, useEffect } from "react";
import { PdfUpload } from "@/components/PdfUpload";
import { AiResults } from "@/components/AiResults";
import { AiNotationData } from "@/lib/services/aiPdfProcessor";
import { toast } from "react-toastify";

interface PartialAiResults {
  filename: string;
  aiSummary: string;
  mnemonics?: string[];
}

export function HomePage() {
  const [aiResults, setAiResults] = useState<PartialAiResults | null>(null);
  const [isLoadingMnemonics, setIsLoadingMnemonics] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleProcessComplete = (data: PartialAiResults) => {
    console.log("HomePage received initial AI data:", data);
    setAiResults(data);
    
    // If mnemonics are not included, set loading state and fetch them separately
    if (!data.mnemonics) {
      setIsLoadingMnemonics(true);
      fetchMnemonics(data.filename, data.aiSummary);
    }
  };
  
  const fetchMnemonics = async (filename: string, summary: string) => {
    try {
      const response = await fetch("/api/generate-mnemonics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          filename,
          summary 
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate mnemonics");
      }
      
      const data = await response.json();
      
      if (data.success && data.mnemonics) {
        setAiResults(prev => prev ? {
          ...prev,
          mnemonics: data.mnemonics
        } : null);
        toast.success("Mnemonics generated successfully");
      } else {
        throw new Error("Invalid mnemonic data received");
      }
    } catch (error) {
      console.error("Error generating mnemonics:", error);
      toast.error("Failed to generate mnemonics. Please try again.");
    } finally {
      setIsLoadingMnemonics(false);
    }
  };

  // Scroll to results when they become available
  useEffect(() => {
    if (aiResults && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [aiResults]);

  return (
    <div className="min-h-screen flex flex-col relative">
      <main className="flex-1 flex flex-col w-full mx-auto">
        <div className="flex-1 flex flex-col items-start justify-center bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-950">
          <section className="max-w-7xl w-full space-y-8 animate-fade-in p-4">
            <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
              SambaScribe - AI Samba Notation Guide
            </h1>
            <p className="text-center text-gray-600 dark:text-gray-400">
              Upload a samba notation file for AI-powered analysis and mnemonic generation
            </p>
            <PdfUpload onProcessComplete={handleProcessComplete} />
            
            {aiResults && (
              <div 
                ref={resultsRef}
                className="w-full transition-all duration-300 animate-fade-in"
              >
                <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-4">
                  AI Analysis Results
                </h2>
                <AiResults 
                  data={aiResults as AiNotationData} 
                  isLoadingMnemonics={isLoadingMnemonics}
                />
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            © {new Date().getFullYear()} All Rights Reserved
          </span>
          <div className="flex items-center gap-6 text-sm text-neutral-600 dark:text-neutral-400">
            <a href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-blue-600 dark:hover:text-blue-400">
              Terms of Service
            </a>
            <a href="/contact" className="hover:text-blue-600 dark:hover:text-blue-400">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
} 