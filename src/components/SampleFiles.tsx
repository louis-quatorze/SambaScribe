"use client";

import { useState } from "react";
import { FileText, ChevronRight } from "lucide-react";
import { toast } from "react-toastify";
import { AiNotationData } from "@/lib/services/aiPdfProcessor";

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
      setIsProcessing(file.id);
      toast.info(`AI is analyzing ${file.title}...`);
      
      // Construct the URL for the sample file
      const sampleFileUrl = `/samples/${file.filename}`;
      console.log("Processing sample file:", sampleFileUrl);
      
      // Try the direct API route first
      const apiEndpoints = [
        "/api/process",
        "/api"  // Fallback to root API if /api/process is not available
      ];
      
      let aiProcessResponse = null;
      let errorText = "";
      
      // Try each API endpoint in order
      for (const apiUrl of apiEndpoints) {
        console.log(`Trying API endpoint: ${apiUrl}`);
        
        const requestBody = { fileUrl: sampleFileUrl };
        
        try {
          const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          });
          
          console.log(`API response from ${apiUrl}:`, response.status);
          
          // If we get a successful response, use it
          if (response.ok) {
            aiProcessResponse = response;
            break;
          } else if (!errorText) {
            // Store the first error text we encounter
            errorText = await response.text();
          }
        } catch (error) {
          console.error(`Error calling ${apiUrl}:`, error);
        }
      }
      
      // If all attempts failed
      if (!aiProcessResponse) {
        console.error("All API endpoints failed");
        throw new Error(`API processing failed: ${errorText.substring(0, 100)}...`);
      }

      let processData;
      try {
        const responseText = await aiProcessResponse.text();
        console.log("Processing successful response:", responseText.substring(0, 100) + "...");
        processData = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse API response:", parseError);
        throw new Error("Received invalid response format from API");
      }
      
      if (!processData || typeof processData !== 'object') {
        toast.error("AI analysis returned an invalid response format");
        return;
      }
      
      toast.success(`${file.title} analyzed with AI successfully`);
      
      if (onProcessComplete) {
        const aiData = processData.data || processData;
        
        if (typeof aiData === 'object' &&
            typeof aiData.filename === 'string' &&
            typeof aiData.aiSummary === 'string' &&
            Array.isArray(aiData.mnemonics)) {
          onProcessComplete(aiData);
        } else {
          const fallbackData = {
            filename: file.filename,
            aiSummary: "The file was analyzed but returned unexpected data. Please try another file.",
            mnemonics: [
              { text: "Error in processing", pattern: "Error", description: "unexpected data format" },
              { text: "Please try again", pattern: "Error", description: "retry recommended" },
              { text: "Contact support if needed", pattern: "Support", description: "get help" }
            ]
          };
          
          toast.warning("AI analysis completed with unexpected results");
          onProcessComplete(fallbackData);
        }
      }
    } catch (error) {
      console.error("Process error:", error);
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

  return (
    <div className="w-full max-w-xl mx-auto mt-8">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
        Sample Files
      </h2>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {sampleFiles.map((file) => (
            <li key={file.id} className="p-0">
              <button
                onClick={() => processFile(file)}
                disabled={isProcessing !== null}
                className="w-full flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
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