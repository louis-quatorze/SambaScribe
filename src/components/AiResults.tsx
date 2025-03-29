"use client";

import { useState } from "react";
import { AiNotationData } from "@/lib/services/aiPdfProcessor";

interface AiResultsProps {
  data: AiNotationData;
}

export function AiResults({ data }: AiResultsProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'mnemonics'>('summary');

  if (!data) {
    return null;
  }

  return (
    <div className="w-full max-w-3xl mx-auto my-8 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'summary'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            AI Summary
          </button>
          <button
            onClick={() => setActiveTab('mnemonics')}
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'mnemonics'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Mnemonics
          </button>
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'summary' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">AI Analysis</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{data.aiSummary}</p>
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
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">AI-Generated Mnemonics</h2>
            {data.mnemonics.length > 0 ? (
              <ul className="space-y-3 list-disc list-inside text-gray-700 dark:text-gray-300">
                {data.mnemonics.map((mnemonic, i) => (
                  <li key={i} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
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