"use client";

import { ChangeEvent, useState } from "react";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";
import { AiNotationData } from "@/lib/services/aiPdfProcessor";

interface PdfUploadProps {
  onFileSelect?: (file: File) => void;
  onProcessComplete?: (data: AiNotationData) => void;
}

const MAX_FILE_SIZE = 7 * 1024 * 1024; // Reducing to 7MB to account for base64 overhead

export function PdfUpload({ onFileSelect, onProcessComplete }: PdfUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Accept PDF or text files
    const validTypes = ['application/pdf', 'text/plain', 'text/markdown'];
    const validExtensions = ['.pdf', '.txt', '.md'];
    const isValidType = validTypes.includes(file.type) || 
                        validExtensions.some(ext => file.name.toLowerCase().endsWith(ext)) ||
                        file.type === 'application/octet-stream';
                        
    if (!isValidType) {
      toast.error("Please upload a PDF or text file");
      event.target.value = ""; // Clear the input
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    
    // Validate file size with more detailed message for PDFs
    if (file.size > MAX_FILE_SIZE) {
      console.log(`File size check: ${file.size} exceeds limit ${MAX_FILE_SIZE}`);
      if (isPdf) {
        console.log("Showing toast error for PDF size");
        toast.error("PDF size exceeds 7MB limit. For better results, try converting to text or reducing the PDF size.");
      } else {
        console.log("Showing toast error for generic file size");
        toast.error("File size exceeds 7MB limit");
      }
      event.target.value = ""; // Clear the input
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      const formData = new FormData();
      formData.append("file", file);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!uploadResponse.ok) {
        const data = await uploadResponse.json();
        
        // Check if this is a premium feature access error
        if (uploadResponse.status === 403 && data.message?.includes('premium')) {
          toast.error("This feature requires a premium subscription");
          
          // Give a 2 second delay before redirecting to pricing
          setTimeout(() => {
            window.location.href = '/pricing';
          }, 2000);
          
          throw new Error("Premium subscription required");
        }
        
        throw new Error(data.error || "Upload failed");
      }

      const uploadData = await uploadResponse.json();
      
      if (onFileSelect) {
        onFileSelect(file);
      }
      
      // Short delay to show upload complete
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsUploading(false);
      
      // Start AI processing with the uploaded file
      setAiProcessing(true);
      toast.info("AI is analyzing your file...");
      
      try {
        const aiProcessResponse = await fetch("/api/ai-process", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ filename: uploadData.filename }),
        });

        if (!aiProcessResponse.ok) {
          const data = await aiProcessResponse.json();
          throw new Error(data.error || "AI processing failed");
        }

        const processData = await aiProcessResponse.json();
        console.log("AI Process Response:", processData);
        
        // Check if we have a valid response format first
        if (!processData || typeof processData !== 'object') {
          console.error("Invalid AI process response format:", processData);
          toast.error("AI analysis completed but returned an invalid response format");
          
          // Use fallback data to avoid UI not showing any results
          if (onProcessComplete) {
            const fallbackData = {
              filename: file.name,
              aiSummary: "Analysis could not be completed due to a server error. Please try again later.",
              mnemonics: [
                { text: "Error connecting to AI service", pattern: "Error", description: "connection issue" },
                { text: "WebSocket connection failed", pattern: "Error", description: "network error" },
                { text: "Try again in a few minutes", pattern: "Tip", description: "retry recommendation" },
                { text: "Server might be restarting", pattern: "Info", description: "server status" },
                { text: "Contact support if the issue persists", pattern: "Support", description: "get help" }
              ]
            };
            onProcessComplete(fallbackData);
          }
          return;
        }
        
        toast.success("File analyzed with AI successfully");
        
        // Ensure the response has the expected structure with more robust checking
        if (onProcessComplete) {
          if (processData.data) {
            const aiData = processData.data;
            
            console.log("Processing AI data:", aiData);
            
            if (typeof aiData === 'object' &&
                typeof aiData.filename === 'string' &&
                typeof aiData.aiSummary === 'string' &&
                Array.isArray(aiData.mnemonics)) {
              console.log("Calling onProcessComplete with data:", aiData);
              onProcessComplete(aiData);
            } else {
              console.error("Failed to process data correctly:", { 
                processData,
                hasData: !!processData.data,
                dataType: processData.data ? typeof processData.data : 'undefined',
                responseStructure: aiData ? 
                  { 
                    hasFilename: typeof aiData?.filename === 'string',
                    hasAiSummary: typeof aiData?.aiSummary === 'string',
                    hasMnemonics: Array.isArray(aiData?.mnemonics)
                  } : 'No data'
              });
              
              // Create a fallback data structure to avoid UI errors
              const fallbackData = {
                filename: processData.data?.filename || "unknown-file",
                aiSummary: processData.data?.aiSummary || "The file was analyzed but returned unexpected data. Please try another file.",
                mnemonics: Array.isArray(processData.data?.mnemonics) ? 
                  processData.data.mnemonics : 
                  [
                    { text: "Error in processing", pattern: "Error", description: "data format issue" },
                    { text: "Please try again", pattern: "Error", description: "retry recommendation" },
                    { text: "Text files work best", pattern: "Tip", description: "file format recommendation" },
                    { text: "Smaller files recommended", pattern: "Tip", description: "file size recommendation" },
                    { text: "Contact support if needed", pattern: "Support", description: "get help" }
                  ]
              };
              
              toast.warning("AI analysis completed with unexpected results");
              onProcessComplete(fallbackData);
            }
          } else {
            // If processData.data is missing but we need to call onProcessComplete
            console.error("Missing data property in AI process response:", processData);
            
            // Try to use the processData directly if it has the right structure
            if (typeof processData === 'object' && 
                typeof processData.filename === 'string' && 
                typeof processData.aiSummary === 'string' && 
                Array.isArray(processData.mnemonics)) {
              console.log("Using processData directly:", processData);
              onProcessComplete(processData);
            } else {
              const fallbackData = {
                filename: "error-processing",
                aiSummary: "The file could not be analyzed correctly. Please try a different file or format.",
                mnemonics: [
                  { text: "Error in processing", pattern: "Error", description: "processing failure" },
                  { text: "Please try again", pattern: "Error", description: "retry recommendation" },
                  { text: "Text files work best", pattern: "Tip", description: "file format recommendation" },
                  { text: "Smaller files recommended", pattern: "Tip", description: "file size recommendation" },
                  { text: "Contact support if needed", pattern: "Support", description: "get help" }
                ]
              };
              console.error("Using fallback data due to missing or invalid data property");
              toast.warning("AI analysis completed but data was in an unexpected format");
              onProcessComplete(fallbackData);
            }
          }
        }
      } catch (aiError) {
        console.error("AI processing error:", aiError);
        toast.error(aiError instanceof Error ? 
          `AI processing error: ${aiError.message}` : 
          "Connection to AI service failed. Please try again later."
        );
        
        // Provide fallback data even when AI processing fails
        if (onProcessComplete) {
          const fallbackData = {
            filename: file.name,
            aiSummary: "The AI service could not process your file due to a WebSocket connection failure. The app is looking for a tRPC WebSocket server at ws://localhost:3001 which is not running. This is needed for real-time updates and subscriptions.",
            mnemonics: [
              { text: "Error: WebSocket connection to 'ws://localhost:3001/' failed", pattern: "Error", description: "connection error" },
              { text: "The tRPC WebSocket server needs to be running", pattern: "Error", description: "server requirement" },
              { text: "Use 'npm run dev' in a separate terminal window to start it", pattern: "Tip", description: "solution recommendation" },
              { text: "Ensure port 3001 is not blocked by firewall", pattern: "Tip", description: "network recommendation" },
              { text: "Contact support if the issue persists", pattern: "Support", description: "get help" }
            ]
          };
          onProcessComplete(fallbackData);
        }
      }
    } catch (error) {
      console.error("Upload/Process error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to handle file. Please try again.");
    } finally {
      setIsUploading(false);
      setAiProcessing(false);
      setUploadProgress(0);
      event.target.value = ""; // Clear the input
    }
  };

  const isLoading = isUploading || aiProcessing;
  const loadingMessage = isUploading 
    ? `Uploading... ${uploadProgress}%` 
    : "AI is analyzing your file...";

  return (
    <div className="w-full max-w-xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <label 
        htmlFor="fileUpload" 
        className="block text-lg font-medium text-gray-700 dark:text-gray-200 mb-4"
      >
        Upload File for AI Analysis
      </label>
      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
        <div className="space-y-1 text-center">
          {isLoading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 text-gray-400 animate-spin" />
              <p className="mt-2 text-sm text-gray-500">
                {loadingMessage}
              </p>
              {isUploading && (
                <div className="w-48 mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <>
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex text-sm text-gray-600 dark:text-gray-400">
                <label
                  htmlFor="fileUpload"
                  className="relative cursor-pointer rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                >
                  <span>Upload a file</span>
                  <input
                    id="fileUpload"
                    name="fileUpload"
                    type="file"
                    accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                    className="sr-only"
                    onChange={handleFileChange}
                    disabled={isLoading}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                PDF or text files only, max 7MB
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 