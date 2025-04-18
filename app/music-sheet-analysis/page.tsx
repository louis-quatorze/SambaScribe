"use client";

import { useState } from "react";
import { MusicSheetUploader } from "@/components/MusicSheetUploader";
import { AiNotationData } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Loader } from "lucide-react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function MusicSheetAnalysisPage() {
  const [results, setResults] = useState<AiNotationData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRawData, setShowRawData] = useState(false);

  const handleProcessStart = () => {
    setIsProcessing(true);
  };

  const handleProcessComplete = (data: AiNotationData) => {
    setResults(data);
    setIsProcessing(false);
    // Log the full result data to console for debugging
    console.log("[MusicSheetAnalysisPage] Full AI results:", data);
    // Scroll to results if needed
    document.getElementById("results-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Music Sheet Analysis</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Music Sheet</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Upload a PDF of your samba music sheet and our AI will analyze it
              to generate mnemonics and provide insights.
            </p>
            <MusicSheetUploader 
              onProcessComplete={handleProcessComplete} 
              onProcessStart={handleProcessStart}
            />
          </Card>
        </div>
        
        <div id="results-section">
          {isProcessing ? (
            <Card className="p-6 flex flex-col items-center justify-center min-h-[300px] text-center">
              <Loader className="w-8 h-8 mb-4 text-primary animate-spin" />
              <p className="text-gray-600 dark:text-gray-400">
                AI is analyzing your music sheet...
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                This may take a minute or two depending on the complexity of the sheet
              </p>
            </Card>
          ) : results ? (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>
              <div className="mb-4">
                <h3 className="text-lg font-medium">File: {results.filename}</h3>
              </div>
              
              <div className="mb-6">
                <div className="prose dark:prose-invert max-w-none">
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    {results.aiSummary.includes('<') && results.aiSummary.includes('>') ? (
                      <div dangerouslySetInnerHTML={{ __html: results.aiSummary }} />
                    ) : (
                      <p className="whitespace-pre-wrap">{results.aiSummary}</p>
                    )}
                  </div>
                </div>
              </div>
              
              {results.labels && results.labels.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Extracted Labels & Captions</h3>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <ul className="list-disc pl-5 space-y-1">
                      {results.labels.map((label, index) => (
                        <li key={index} className="text-gray-700 dark:text-gray-300">
                          {label}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              <div>
                <h3 className="text-lg font-medium mb-2">Mnemonics</h3>
                <div className="space-y-4">
                  {results.mnemonics.map((mnemonic, index) => (
                    <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-4 border-blue-500">
                      <div className="font-semibold text-blue-600 dark:text-blue-400">{mnemonic.pattern || `Rhythm Pattern ${index + 1}`}</div>
                      <div className="text-lg my-2 font-mono">&quot;{mnemonic.text}&quot;</div>
                      {mnemonic.description && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                          {mnemonic.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-6 flex flex-col items-center justify-center min-h-[300px] text-center">
              <p className="text-gray-500 dark:text-gray-400">
                Upload a music sheet to see the analysis results here
              </p>
            </Card>
          )}
        </div>
      </div>
      
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  );
} 