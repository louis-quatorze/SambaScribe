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
      if (isPdf) {
        toast.error("PDF size exceeds 7MB limit. For better results, try converting to text or reducing the PDF size.");
      } else {
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
        
        toast.success("File analyzed with AI successfully");
        
        // Simplified the response handling to directly utilize the data structure from the API response
        if (onProcessComplete && processData.data) {
          console.log("Calling onProcessComplete with data:", processData.data);
          onProcessComplete(processData.data);
        } else if (onProcessComplete && processData.success === false && processData.data) {
          // Handle error case with error data
          console.log("Using error fallback data:", processData.data);
          onProcessComplete(processData.data);
        } else if (onProcessComplete) {
          // Fallback for unexpected response format
          console.error("Unexpected API response format:", processData);
          const fallbackData = {
            filename: file.name,
            aiSummary: "Analysis could not be completed in the expected format. Please try a different file.",
            mnemonics: [
              "Error processing the file",
              "Please try again with a different file",
              "Text files work best",
              "Smaller files recommended",
              "Contact support if needed"
            ]
          };
          toast.warning("AI analysis completed but returned unexpected data format");
          onProcessComplete(fallbackData);
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
            aiSummary: "The AI service could not process your file. This could be due to a connection issue or server error.",
            mnemonics: [
              "Error processing the file",
              "Please try again later",
              "The server may be temporarily unavailable",
              "Ensure you're connected to the internet",
              "Contact support if the issue persists"
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
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3 dark:bg-gray-700">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
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
                  className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none"
                >
                  <span>Upload a file</span>
                  <input
                    id="fileUpload"
                    name="fileUpload"
                    type="file"
                    className="sr-only"
                    onChange={handleFileChange}
                    accept=".pdf,.txt,.md"
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                PDF or text files only, max 7MB
              </p>
              <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                For best results with PDFs, convert complex files to text or reduce file size.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 