"use client";

import { useState, useEffect } from "react";
import { AiNotationData } from "@/lib/services/aiPdfProcessor";
import { FileText, BookOpen, ScrollText, Music, ListMusic } from "lucide-react";

interface AiResultsProps {
  data: AiNotationData;
}

export function AiResults({ data }: AiResultsProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'mnemonics' | 'verification' | 'sections'>('summary');

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

  // Extract potential pdf content insights from the summary
  const isPdf = safeData.filename.toLowerCase().endsWith('.pdf');
  const extractSummaryInsights = () => {
    const summary = safeData.aiSummary || '';
    // Look for quoted text, potential pattern names, or musical terms
    const quotedText = summary.match(/"([^"]*)"/g) || [];
    const patternMatches = summary.match(/break|pattern|rhythm|beat|tempo|instrument|surdo|caixa|repinique|agogô|timbal/gi) || [];
    
    return {
      quotedText: quotedText.map(t => t.replace(/"/g, '')),
      patterns: patternMatches
    };
  };

  const insights = extractSummaryInsights();

  return (
    <div className="w-full max-w-3xl mx-auto my-8 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-100 dark:border-gray-700 transform transition-all duration-300">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 text-sm font-medium ${
              activeTab === 'summary'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/20'
            }`}
          >
            <FileText className="w-4 h-4" />
            Summary
          </button>
          <button
            onClick={() => setActiveTab('mnemonics')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 text-sm font-medium ${
              activeTab === 'mnemonics'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/20'
            }`}
          >
            <Music className="w-4 h-4" />
            Mnemonics
          </button>
          <button
            onClick={() => setActiveTab('sections')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 text-sm font-medium ${
              activeTab === 'sections'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/20'
            }`}
          >
            <ListMusic className="w-4 h-4" />
            Sections
          </button>
          {isPdf && (
            <button
              onClick={() => setActiveTab('verification')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 text-sm font-medium ${
                activeTab === 'verification'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/20'
              }`}
            >
              <ScrollText className="w-4 h-4" />
              PDF Verification
            </button>
          )}
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'summary' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">AI Analysis</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p 
                className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed"
                dangerouslySetInnerHTML={{ __html: safeData.aiSummary }}
              />
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
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {typeof mnemonic === 'object' && mnemonic?.pattern ? mnemonic.pattern : 'Pattern'}
                        </span>
                        {typeof mnemonic === 'object' && mnemonic?.description && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                            {mnemonic.description}
                          </span>
                        )}
                      </div>
                      <div className="text-lg">
                        {typeof mnemonic === 'object' && mnemonic?.text ? mnemonic.text : String(mnemonic)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No mnemonics were generated.</p>
            )}
          </div>
        )}

        {activeTab === 'sections' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Section Labels</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {safeData.mnemonics
                .map(mnemonic => mnemonic.pattern)
                .filter((pattern, index, self) => pattern && self.indexOf(pattern) === index)
                .sort()
                .map((pattern, i) => (
                  <div 
                    key={i}
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md shadow-sm border border-gray-100 dark:border-gray-600"
                  >
                    <span className="text-lg text-gray-800 dark:text-gray-200">{pattern}</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {activeTab === 'verification' && isPdf && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">PDF Content Verification</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300">
                Some elements detected in your document:
              </p>
              
              {insights.quotedText.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium text-gray-800 dark:text-white">Quoted Texts/Terms Found:</h3>
                  <ul className="mt-2 space-y-1 list-disc pl-5">
                    {insights.quotedText.map((text, i) => (
                      <li key={i} className="text-gray-700 dark:text-gray-300">{text}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {insights.patterns.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium text-gray-800 dark:text-white">Patterns/Musical Terms Identified:</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {insights.patterns.map((pattern, i) => (
                      <span key={i} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                        {pattern}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 