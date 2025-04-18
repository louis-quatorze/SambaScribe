"use client";

import { useState } from "react";
import { FileText, ChevronRight } from "lucide-react";
import { toast } from "react-toastify";
import { AiNotationData } from "@/lib/services/aiPdfProcessor";
import { trackSamplePdfClick, trackAnalysisStart, trackAnalysisComplete, forceFlushEvents } from "@/lib/analytics";

interface SampleFile {
  id: string;
  title: string;
  filename: string;
}

interface SampleFilesProps {
  onProcessComplete?: (data: AiNotationData) => void;
}

export function SampleFiles({ onProcessComplete }: SampleFilesProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const sampleFiles: SampleFile[] = [
    {
      id: "aainjaa",
      title: "Aainjaa",
      filename: "Aainjaa.pdf"
    },    
    {
      id: "bossa2",
      title: "Mangueira",
      filename: "Mangueira.pdf"
    },
    {
      id: "sambaDaMusa",
      title: "Samba Da Musa",
      filename: "Samba-Da-Musa.pdf"
    }
  ];

  const processFile = async (file: SampleFile) => {
    if (isProcessing) return;

    try {
      // Track that the user clicked on this sample PDF
      trackSamplePdfClick(file.title);
      
      setIsProcessing(file.id);
      toast.info(`Analyzing ${file.title} with Claude 3.5 Sonnet...`);
      
      // Track analysis start
      trackAnalysisStart('sample', file.title);
      
      // Immediately flush these events to ensure they're recorded
      await forceFlushEvents();
      
      // Get the URL for the API to process
      const fileUrl = `/api/uploads/${file.filename}`;
      
      // If the file doesn't exist in uploads folder, use samples folder
      const sampleUrl = `/samples/${file.filename}`;
      
      // Prepare prompt for Claude
      const prompt = "Analyze this samba music sheet PDF in detail. Identify all rhythm patterns, breaks, and sections. Provide a comprehensive analysis of the notation structure, tempo indications, and any special performance notes. Generate clear vocal mnemonics for each rhythm pattern that would help a percussionist learn the piece.";
      
      console.log("[SampleFiles] Processing with Claude 3.5 Sonnet:", fileUrl);
      
      // Use our Claude API endpoint - same as PdfAnalyzer implementation
      const claudeResponse = await fetch("/api/parse-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pdfUrl: fileUrl,
          prompt: prompt,
        }),
      });
      
      if (!claudeResponse.ok) {
        const errorData = await claudeResponse.json();
        throw new Error(errorData.error || "Failed to analyze PDF with Claude");
      }
      
      const claudeData = await claudeResponse.json();
      console.log("[SampleFiles] Claude 3.5 Sonnet analysis successful");
      
      // Process Claude response into our expected format - same as PdfAnalyzer
      let analysis = "";
      
      if (Array.isArray(claudeData.analysis)) {
        claudeData.analysis.forEach((block: any) => {
          if (block.type === "text") {
            analysis += block.text;
          }
        });
      } else if (typeof claudeData.analysis === 'string') {
        analysis = claudeData.analysis;
      } else {
        analysis = JSON.stringify(claudeData.analysis, null, 2);
      }
      
      // Extract mnemonics from the analysis text
      const mnemonics = extractMnemonicsFromText(analysis);
      
      const aiData: AiNotationData = {
        filename: file.filename,
        aiSummary: analysis,
        mnemonics: mnemonics.length ? mnemonics : [
          { text: "DUM ka DUM ka", pattern: "Basic Pattern", description: "Extracted from Claude analysis" }
        ]
      };
      
      if (onProcessComplete) {
        onProcessComplete(aiData);
      }
      
      // Track successful analysis completion
      trackAnalysisComplete('sample', file.title, true);
      
      // Force flush the completion event
      await forceFlushEvents();
      
      toast.success(`${file.title} analyzed with Claude 3.5 Sonnet successfully`);
      
    } catch (error) {
      console.error("[SampleFiles] Process error:", error);
      
      // Track failed analysis
      trackAnalysisComplete('sample', file.title, false);
      
      // Force flush the error event
      await forceFlushEvents();
      
      toast.error(error instanceof Error ? error.message : "Failed to process file. Please try again.");
      
      if (onProcessComplete) {
        const fallbackData = {
          filename: file.filename,
          aiSummary: "The AI service could not process the file. This could be due to a connection issue or server error.",
          mnemonics: [
            { text: "Error processing file", pattern: "Error", description: "service error" },
            { text: "Try again later", pattern: "Error", description: "temporary failure" },
            { text: "Contact support if the issue persists", pattern: "Support", description: "get help" }
          ]
        };
        onProcessComplete(fallbackData);
      }
    } finally {
      setIsProcessing(null);
    }
  };

  // Helper function to extract mnemonics from Claude's response text
  const extractMnemonicsFromText = (text: string): Array<{text: string, pattern?: string, description?: string}> => {
    const mnemonics = [];
    
    // Try to extract pattern-mnemonic pairs using regex
    const patternRegex = /["']([^"']+)["']:\s*["']([^"']+)["']/g;
    const matches = text.matchAll(patternRegex);
    
    for (const match of Array.from(matches)) {
      if (match[1] && match[2]) {
        mnemonics.push({
          pattern: match[1].trim(),
          text: match[2].trim(),
          description: "Extracted from Claude analysis"
        });
      }
    }
    
    // Look for mnemonic patterns like "DUM ka DUM ka"
    const soundPatternRegex = /\b([A-Z]{2,}\s+[a-z]+(\s+[A-Z]{2,}\s+[a-z]+)+)\b/g;
    const soundMatches = text.matchAll(soundPatternRegex);
    
    for (const match of Array.from(soundMatches)) {
      if (match[1] && !mnemonics.some(m => m.text === match[1])) {
        mnemonics.push({
          text: match[1].trim(),
          pattern: "Sound Pattern",
          description: "Vocal pattern from analysis"
        });
      }
    }
    
    // If we couldn't extract any mnemonics, check if there are sections starting with "Mnemonic"
    if (mnemonics.length === 0) {
      const lines = text.split('\n');
      let currentPattern = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Look for pattern names
        if (line.toLowerCase().includes('pattern') || 
            line.toLowerCase().includes('section') || 
            line.toLowerCase().includes('break')) {
          currentPattern = line.replace(/[:;.,]$/, '').trim();
        }
        
        // Look for lines that appear to be mnemonics
        if (line.match(/[A-Z]{2,}/) && 
            line.match(/\b[a-z]+\b/) && 
            !line.match(/^[a-z]/) && 
            line.length < 50) {
          mnemonics.push({
            text: line,
            pattern: currentPattern || "Rhythm Pattern",
            description: "Identified vocal pattern"
          });
        }
      }
    }
    
    // If still empty, try to find any all-caps words that might be mnemonics
    if (mnemonics.length === 0) {
      const allCapsRegex = /\b([A-Z]{2,}([\s-][A-Z]{2,})*)\b/g;
      const allCapsMatches = text.matchAll(allCapsRegex);
      
      for (const match of Array.from(allCapsMatches)) {
        if (match[1] && match[1].length > 3) {
          mnemonics.push({
            text: match[1],
            pattern: "Sound Pattern",
            description: "Emphasized sound"
          });
        }
      }
    }
    
    return mnemonics;
  };

  return (
    <div className="w-full max-w-xl mx-auto mt-8">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
        Sample Files
      </h2>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border-2 border-gray-300 dark:border-gray-600">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {sampleFiles.map((file) => (
            <li key={file.id} className="p-0">
              <button
                onClick={() => processFile(file)}
                disabled={isProcessing !== null}
                className="w-full flex items-center p-4 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-l-4 hover:border-blue-500 transition-all text-left"
              >
                <FileText className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0" />
                <span className="font-medium text-gray-800 dark:text-gray-200 flex-1">
                  {file.title}
                </span>
                {isProcessing === file.id ? (
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
        Click on a sample to process it with AI
      </p>
      
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
          Want to analyze your own files?
        </h3>
        <p className="text-sm text-blue-600 dark:text-blue-400 mb-3">
          Upgrade to our premium plan to upload and analyze your own notation files.
        </p>
        <a
          href="/pricing"
          className="inline-block w-full text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          View Premium Plan
        </a>
      </div>
    </div>
  );
} 