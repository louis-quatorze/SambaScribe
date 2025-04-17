"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/Header";
import { LockIcon, FileText, UploadCloud, Loader2, Music, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "react-toastify";
import { api } from "@/lib/trpc/react";
import { SubscriptionManager } from "@/components/SubscriptionManager";
import { PdfUpload } from "@/components/PdfUpload";
import ClientProvider from "@/components/ClientProvider";
import Image from "next/image";

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
    // Allow sample PDFs to be analyzed without authentication
    if (!isSample && status !== "authenticated") {
      toast.error("Please sign in to analyze your uploaded PDFs.");
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
    
    // If it's a sample and user is not authenticated, we'll still show analysis but with a prompt to sign in for more
    if (isSample && status !== "authenticated") {
      analyzePdfMutation.mutate({ 
        pdfUrl, 
        prompt: `Analyze sample PDF: ${decodeURIComponent(filename)} (limited preview)` 
      });
      toast.info("Sign in for full analysis capabilities.");
    } else {
      analyzePdfMutation.mutate({ 
        pdfUrl, 
        prompt: `Analyze ${isSample ? 'sample' : 'uploaded'} PDF: ${decodeURIComponent(filename)}` 
      });
    }
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

      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
        <ClientProvider>
          <div className="space-y-8">
            {/* Hero Section */}
            <section className="text-center py-10 md:py-14 px-6 rounded-2xl bg-blue-600 text-white shadow-md">
              <h1 className="text-3xl md:text-5xl font-bold mb-5 tracking-tight">
                SambaScribe PDF Analyzer
              </h1>
              <p className="text-lg md:text-xl max-w-2xl mx-auto opacity-90 mb-6">
                Analyze PDF documents with AI to understand samba rhythms, patterns, and musical structures.
              </p>
              
              <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-lg">
                <div className="flex items-center animate-pulse">
                  <FileText className="w-6 h-6 mr-2" />
                  <span>PDF</span>
                </div>
                <div className="text-2xl font-bold">→</div>
                <div className="flex items-center">
                  <Sparkles className="w-6 h-6 mr-2" />
                  <span>AI</span>
                </div>
                <div className="text-2xl font-bold">→</div>
                <div className="flex items-center animate-bounce">
                  <Music className="w-6 h-6 mr-2" />
                  <span>Music</span>
                </div>
              </div>
            </section>
            
            {/* Main Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
              {/* Illustration */}
              <div className="md:col-span-3 flex justify-center md:justify-start items-center mb-4 md:mb-0">
                <div className="relative rounded-2xl overflow-hidden shadow-md max-w-xs border-2 border-gray-50 dark:border-gray-800">
                  <Image 
                    src="/files/Illustration.jpg" 
                    alt="Samba Rhythm Illustration" 
                    width={300} 
                    height={400}
                    className="object-cover rounded-2xl w-full h-auto hover:scale-105 transition-transform duration-300"
                    priority
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent py-2 px-3">
                    <p className="text-white text-xs font-medium">Samba Rhythm Illustration</p>
                  </div>
                </div>
              </div>

              {/* Sample PDFs Section */}
              <div className="bg-white dark:bg-gray-800 p-6 sm:p-7 rounded-xl shadow-sm transition-all hover:shadow-md border border-gray-100 dark:border-gray-700 h-full md:col-span-4 flex flex-col">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-500" />
                  Sample PDFs
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
                  Try out our sample documents to see how SambaScribe works
                </p>
                <div className="grid grid-cols-1 gap-4">
                  {sampleFiles.map((file) => (
                    <button
                      key={file.name}
                      onClick={() => handleAnalyzePdf(file.filename, true)}
                      disabled={isLoading}
                      className="flex items-center p-4 border border-gray-300 dark:border-gray-500 rounded-2xl cursor-pointer bg-gray-50/90 dark:bg-gray-700/90 hover:bg-blue-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] text-left shadow-sm"
                    >
                      <FileText className="w-5 h-5 mr-3 text-blue-500 flex-shrink-0" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {file.name}
                      </span>
                    </button>
                  ))}
                </div>
                {status === "unauthenticated" && (
                  <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-4">
                    Try our sample PDFs and sign in for more features
                  </p>
                )}
              </div>

              {/* Upload PDF Section */}
              <div className="bg-white dark:bg-gray-800 p-6 sm:p-7 rounded-xl shadow-sm transition-all hover:shadow-md border border-gray-100 dark:border-gray-700 h-full md:col-span-5">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <UploadCloud className="w-5 h-5 mr-2 text-blue-500" />
                  Upload PDF
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
                  Upload your own PDF document for AI analysis
                </p>
                {status === "unauthenticated" ? (
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-5 text-center bg-gray-50 dark:bg-gray-800/30">
                    <LockIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Sign In Required</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Please sign in to upload and analyze your own PDF files.
                    </p>
                    <Link
                      href="/api/auth/signin"
                      className="inline-flex items-center px-4 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Sign In
                    </Link>
                  </div>
                ) : isCheckingSubscription ? (
                  <div className="flex justify-center items-center p-6 border rounded-lg bg-gray-50 dark:bg-gray-800/30">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span className="text-sm">Checking subscription status...</span>
                  </div>
                ) : hasSubscription ? (
                  <div className="p-2">
                    <PdfUpload 
                      onUploadComplete={handleUploadComplete} 
                      disabled={isLoading} 
                    />
                  </div>
                ) : (
                  // User is authenticated but no subscription
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-5 text-center bg-gray-50 dark:bg-gray-800/30">
                    <LockIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Premium Feature</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Uploading your own files requires a premium subscription.
                    </p>
                    <Link
                      href="/api/stripe/checkout"
                      className="inline-flex items-center px-4 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Upgrade to Premium
                    </Link>
                  </div>
                )}
              </div>

              {/* Subscription Manager Section */} 
              <div className="bg-white dark:bg-gray-800 p-6 sm:p-7 rounded-xl shadow-sm transition-all hover:shadow-md border border-gray-100 dark:border-gray-700 md:col-span-12 lg:col-span-5 md:row-start-2 lg:row-start-1 lg:col-start-8 h-full">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-blue-500" />
                  {status === "authenticated" ? "Your Subscription" : "Get Premium"}
                </h2>
                {status === "authenticated" ? (
                  <>
                    <SubscriptionManager />
                    {!hasSubscription && (
                      <div className="mt-5 text-center px-2">
                        <Link
                          href="/api/stripe/checkout"
                          className="inline-flex items-center justify-center w-full px-4 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Upgrade to Premium
                        </Link>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center p-4">
                    <div className="mb-5">
                      <h3 className="text-lg font-semibold mb-3">Premium Benefits</h3>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-3 text-left">
                        <li className="flex items-start">
                          <span className="mr-2 text-green-500">✓</span>
                          Upload your own PDF scores
                        </li>
                      </ul>
                    </div>
                    <Link
                      href="/api/auth/signin"
                      className="inline-flex items-center justify-center w-full px-4 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Sign In to Subscribe
                    </Link>
                  </div>
                )}
              </div>
            </div>
            
            {/* Analysis Results Section */}
            {analysisResult && (
              <div className="mt-8" ref={resultsRef}>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 sm:p-7 border border-gray-100 dark:border-gray-700">
                  <h2 className="text-xl font-bold mb-4 flex items-center">
                    <Music className="w-5 h-5 mr-2 text-blue-500" />
                    Analysis Results {analyzedFilename ? `for ${analyzedFilename}` : ""}
                  </h2>
                  <div className="prose dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap font-mono text-sm bg-gray-50 dark:bg-gray-700 p-5 rounded-lg overflow-auto max-h-[600px]">
                      {analysisResult}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ClientProvider>
      </main>

      <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            © {new Date().getFullYear()} All Rights Reserved
          </span>
          <div className="flex items-center gap-8 text-sm text-neutral-600 dark:text-neutral-400">
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