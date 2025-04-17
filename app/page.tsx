"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/Header";
import { LockIcon, FileText, UploadCloud, Loader2, Music } from "lucide-react";
import Link from "next/link";
import { toast } from "react-toastify";
import { api } from "@/lib/trpc/react";
import { SubscriptionManager } from "@/components/SubscriptionManager";
import { PdfUpload } from "@/components/PdfUpload";
import ClientProvider from "@/components/ClientProvider";

// Define sample PDFs from the /samples/ directory
const sampleFiles = [
  { name: "Aainjaa", filename: "Aainjaa.pdf" },
  { name: "Mangueira", filename: "Mangueira.pdf" },
  { name: "Samba Da Musa", filename: "Samba-Da-Musa.pdf" }, // Note the hyphen
];

export default function HomePage() {
  const { data: session, status } = useSession();
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analyzedFilename, setAnalyzedFilename] = useState<string | null>(null); // Track which file was analyzed
  const [hasSubscription, setHasSubscription] = useState<boolean>(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const analyzePdfMutation = api.pdfAnalyzer.analyzePdf.useMutation({
    onSuccess: (data, variables) => {
      // Extract filename from the URL used in the mutation input
      const urlParts = variables.pdfUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      setAnalyzedFilename(decodeURIComponent(filename)); // Store decoded filename
      setAnalysisResult(data.analysis);
      toast.success(`Analyzed ${decodeURIComponent(filename)} successfully!`);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    },
    onError: (error, variables) => {
      const urlParts = variables.pdfUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      toast.error(`Analysis failed for ${decodeURIComponent(filename)}: ${error.message}`);
      setAnalyzedFilename(null); // Clear filename on error
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  useEffect(() => {
    const checkSubscription = async () => {
      if (status !== "authenticated" || !session?.user) return;
      try {
        setIsCheckingSubscription(true);
        const response = await fetch('/api/stripe/subscription');
        if (!response.ok) throw new Error('Failed to fetch subscription data');
        const data = await response.json();
        setHasSubscription(data.hasAccess);
      } catch (error) {
        console.error('Error fetching subscription:', error);
        toast.error("Failed to check subscription status.");
        setHasSubscription(false);
      } finally {
        setIsCheckingSubscription(false);
      }
    };
    checkSubscription();
  }, [session, status]);

  const getSamplePdfUrl = (filename: string) => {
    // Ensure this runs client-side where window is defined
    if (typeof window !== 'undefined') {
      // Construct URL relative to the origin, pointing to the /samples directory
      return `${window.location.origin}/samples/${filename}`;
    }
    return ""; // Return empty string or handle server-side case if necessary
  };

  const handleAnalyzePdf = (filename: string, isSample: boolean) => {
    if (status !== "authenticated") {
      toast.error("Please sign in to analyze PDFs.");
      return;
    }
    // Construct URL differently for samples vs uploads if needed
    const pdfUrl = isSample ? getSamplePdfUrl(filename) : filename;

    if (!pdfUrl) {
        toast.error("Could not determine PDF URL.");
        return;
    }

    setIsLoading(true);
    setAnalysisResult(null);
    setAnalyzedFilename(null); // Clear previous filename
    analyzePdfMutation.mutate({ pdfUrl, prompt: `Analyze ${isSample ? 'sample' : 'uploaded'} PDF: ${decodeURIComponent(filename)}` });
  };

  const handleUploadComplete = (uploadedUrl: string) => {
    if (!hasSubscription) {
        toast.error("Subscription required to analyze uploaded files.");
        return;
    }
    
    // Construct the absolute URL for the uploaded file
    const absoluteUrl = `${window.location.origin}${uploadedUrl}`;
    
    // Extract the filename from the URL for display purposes
    const urlParts = uploadedUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    
    // Call the analyze function with the URL and set it as not a sample
    handleAnalyzePdf(absoluteUrl, false);
    
    toast.info(`File uploaded successfully. Analyzing ${filename}...`);
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-white dark:bg-gray-900">
      <Header />

      <main className="flex-1 flex flex-col w-full mx-auto">
        <ClientProvider>
          <div className="flex-1 flex flex-col items-center justify-center">
            <section className="max-w-7xl w-full space-y-8 animate-fade-in p-4 md:p-8">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  SambaScribe PDF Analyzer
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
                  Analyze PDF documents using AI. Select a sample or upload your own.
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
                    Analyze Sample PDFs
                  </h2>
                  <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                          Select one of our sample documents
                      </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {sampleFiles.map((file) => (
                      <button
                        key={file.name}
                        onClick={() => handleAnalyzePdf(file.filename, true)}
                        disabled={isLoading || status !== "authenticated"}
                        className="flex flex-col items-center justify-center p-6 border rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <FileText className="w-10 h-10 mb-2 text-blue-500" />
                        <span className="text-sm font-medium text-center text-gray-700 dark:text-gray-300">
                          {file.name}
                        </span>
                      </button>
                    ))}
                  </div>
                  {status === "unauthenticated" && (
                      <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-3">Please sign in to analyze samples.</p>
                  )}
                </div>

                {/* Upload PDF Section */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      Upload Your PDF
                  </h2>
                  <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                          Upload your own PDF document
                      </p>
                  </div>
                  {status === "unauthenticated" ? (
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center bg-gray-50 dark:bg-gray-800/30">
                      <LockIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Sign In Required</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Please sign in to upload and analyze your own PDF files.
                      </p>
                      <Link
                        href="/api/auth/signin"
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Sign In
                      </Link>
                    </div>
                  ) : isCheckingSubscription ? (
                    <div className="flex justify-center items-center p-6 border rounded-lg bg-gray-50 dark:bg-gray-800/30">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>Checking subscription status...</span>
                    </div>
                  ) : hasSubscription ? (
                    <div>
                      <PdfUpload 
                        onUploadComplete={handleUploadComplete} 
                        disabled={isLoading} 
                      />
                    </div>
                  ) : (
                    // User is authenticated but no subscription
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center bg-gray-50 dark:bg-gray-800/30">
                      <LockIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Premium Feature</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Uploading your own files requires a premium subscription.
                      </p>
                      <Link
                        href="/api/stripe/subscription"
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Upgrade to Premium
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Subscription Manager Section */} 
              {status === "authenticated" && (
                <div className="w-full mt-8 mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Your Subscription
                  </h2>
                  <SubscriptionManager />
                </div>
              )}

              {/* AI Analysis Results Section */}
              {(isLoading || analysisResult) && (
                <div ref={resultsRef} className="w-full transition-all duration-300 animate-fade-in mt-8 space-y-4">
                  <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-6">
                    AI Analysis Results {analyzedFilename ? `for ${analyzedFilename}` : ''}
                  </h2>
                  <div className="p-6 border rounded-lg bg-white dark:bg-gray-800 shadow-md min-h-[150px]">
                    {isLoading ? (
                      <div className="flex justify-center items-center h-full py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        <span className="ml-3 text-lg text-gray-600 dark:text-gray-400">Analyzing PDF... Please wait.</span>
                      </div>
                    ) : analysisResult ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                        {analysisResult}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </section>
          </div>
        </ClientProvider>
      </main>

      <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-gray-900">
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