"use client";

import { useState, useEffect } from "react";
import { AiNotationData } from "@/lib/services/aiPdfProcessor";
import { FileText, BookOpen } from "lucide-react";

interface AiResultsProps {
  data: AiNotationData;
}

export function AiResults({ data }: AiResultsProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'mnemonics'>('summary');

  // Add more extensive debug logging
  useEffect(() => {
    console.log("AiResults component received data:", data);
    console.log("Data type:", typeof data);
    console.log("Has properties:", {
      hasFilename: 'filename' in (data || {}),
      hasAiSummary: 'aiSummary' in (data || {}),
      hasMnemonics: 'mnemonics' in (data || {})
    });
  }, [data]);
  
  // More robust null/undefined/invalid data checking
  if (!data || typeof data !== 'object') {
    console.warn("AiResults received null/undefined data");
    return null;
  }

  // Ensure required properties exist with fallbacks
  const safeData = {
    filename: typeof data.filename === 'string' ? data.filename : 'unknown-file',
    aiSummary: typeof data.aiSummary === 'string' ? data.aiSummary : 'No summary available',
    mnemonics: Array.isArray(data.mnemonics) ? data.mnemonics : []
  };

  return (
    <div className="w-full max-w-3xl mx-auto my-8 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-100 dark:border-gray-700 transform transition-all duration-300">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all ${
              activeTab === 'summary'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/20'
            }`}
          >
            <FileText className="w-4 h-4" />
            AI Summary
          </button>
          <button
            onClick={() => setActiveTab('mnemonics')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all ${
              activeTab === 'mnemonics'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/20'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Mnemonics
          </button>
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'summary' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">AI Analysis</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">{safeData.aiSummary}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md mt-4">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Note: This is a general analysis of samba notation based on the file name. 
                PDF parsing has been simplified to avoid technical errors.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'mnemonics' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">AI-Generated Mnemonics</h2>
            {safeData.mnemonics.length > 0 ? (
              <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                {safeData.mnemonics.map((mnemonic, i) => (
                  <li key={i} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md shadow-sm border border-gray-100 dark:border-gray-600 hover:shadow-md transition-shadow">
                    {mnemonic}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No mnemonics were generated.</p>
            )}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md mt-4">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                These mnemonics are general examples for common samba patterns rather than specific to your file's content.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 