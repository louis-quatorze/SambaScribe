"use client";

import { ChangeEvent, useState } from "react";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";

interface TextUploadProps {
  onFileSelect?: (file: File) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

export function TextUpload({ onFileSelect }: TextUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match('text.*') && file.type !== 'application/octet-stream') {
      toast.error("Please upload a text file (.txt, .md, etc.)");
      event.target.value = ""; // Clear the input
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size exceeds 10MB limit");
      event.target.value = ""; // Clear the input
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const data = await uploadResponse.json();
        throw new Error(data.error || "Upload failed");
      }

      const uploadData = await uploadResponse.json();
      
      // Process the uploaded text file
      setIsProcessing(true);
      const processResponse = await fetch("/api/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename: uploadData.filename }),
      });

      if (!processResponse.ok) {
        const data = await processResponse.json();
        throw new Error(data.error || "Processing failed");
      }

      const processData = await processResponse.json();
      toast.success("Text file processed successfully");
      
      if (onFileSelect) {
        onFileSelect(file);
      }
    } catch (error) {
      console.error("Upload/Process error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to handle text file. Please try again.");
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
      event.target.value = ""; // Clear the input
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <label 
        htmlFor="textUpload" 
        className="block text-lg font-medium text-gray-700 dark:text-gray-200 mb-4"
      >
        Upload Text File
      </label>
      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
        <div className="space-y-1 text-center">
          {isUploading || isProcessing ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 text-gray-400 animate-spin" />
              <p className="mt-2 text-sm text-gray-500">
                {isUploading ? "Uploading..." : "Processing..."}
              </p>
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
                  htmlFor="textUpload"
                  className="relative cursor-pointer rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                >
                  <span>Upload a file</span>
                  <input
                    id="textUpload"
                    name="textUpload"
                    type="file"
                    accept=".txt,.md,.text,text/plain"
                    className="sr-only"
                    onChange={handleFileChange}
                    disabled={isUploading || isProcessing}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Text files only (.txt, .md), max 10MB
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 