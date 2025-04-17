"use client";

import { useState } from "react";
import { toast } from "react-toastify";

interface PdfAnalyzerProps {
  pdfUrl: string;
  onAnalysisComplete?: (result: any) => void;
}

export function PdfAnalyzer({ pdfUrl, onAnalysisComplete }: PdfAnalyzerProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [analysis, setAnalysis] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt for analysis");
      return;
    }

    setAnalyzing(true);
    try {
      toast.info("Analyzing PDF with Claude...");
      
      const response = await fetch("/api/parse-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pdfUrl,
          prompt,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze PDF");
      }
      
      const data = await response.json();
      
      // Handle Claude's response format which comes as an array of content blocks
      let analysisText = "";
      if (Array.isArray(data.analysis)) {
        data.analysis.forEach((block: any) => {
          if (block.type === "text") {
            analysisText += block.text;
          }
        });
      } else if (typeof data.analysis === 'string') {
        analysisText = data.analysis;
      } else {
        analysisText = JSON.stringify(data.analysis, null, 2);
      }
      
      setAnalysis(analysisText);
      if (onAnalysisComplete) {
        onAnalysisComplete(data);
      }
      toast.success("PDF analyzed successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to analyze PDF");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
        <h3 className="font-medium mb-2">Analyze PDF with Claude</h3>
        <p className="text-sm text-gray-500 mb-4">
          PDF URL: {pdfUrl}
        </p>
        <div className="mb-4">
          <label htmlFor="prompt" className="block text-sm font-medium mb-1">
            What would you like to ask about this PDF?
          </label>
          <textarea
            id="prompt"
            className="w-full p-2 border rounded-md"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g., Identify the main rhythm patterns and provide a summary of this samba sheet music."
            disabled={analyzing}
          />
        </div>
        <button
          onClick={handleAnalyze}
          disabled={analyzing || !prompt.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {analyzing ? "Analyzing..." : "Analyze PDF"}
        </button>
      </div>

      {analysis && (
        <div className="p-4 border rounded-lg bg-white dark:bg-gray-900">
          <h3 className="font-medium mb-2">Analysis Results</h3>
          <div className="whitespace-pre-wrap text-sm">
            {analysis}
          </div>
        </div>
      )}
    </div>
  );
} 