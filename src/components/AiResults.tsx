"use client";

import { useState } from "react";
import { AiNotationData } from "@/lib/services/aiPdfProcessor";

interface AiResultsProps {
  data: AiNotationData;
}

export function AiResults({ data }: AiResultsProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'mnemonics' | 'patterns' | 'raw'>('summary');

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
          <button
            onClick={() => setActiveTab('patterns')}
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'patterns'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Detected Patterns
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'raw'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Raw Text
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
            {data.instruments.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white">Instruments Detected</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.instruments.map((instrument, i) => (
                    <span 
                      key={i} 
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    >
                      {instrument}
                    </span>
                  ))}
                </div>
              </div>
            )}
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
          </div>
        )}

        {activeTab === 'patterns' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Detected Patterns</h2>
            {data.patterns.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.patterns.map((pattern, i) => (
                  <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md font-mono">
                    {pattern}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No patterns were detected.</p>
            )}
            
            {data.breaks.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white">Breaks</h3>
                <ul className="mt-2 space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300">
                  {data.breaks.map((breakText, i) => (
                    <li key={i}>{breakText}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'raw' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Raw Text From PDF</h2>
            <pre className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-800 dark:text-gray-300 whitespace-pre-wrap overflow-auto max-h-96">
              {data.text}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
} 