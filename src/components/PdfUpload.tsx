"use client";

import { ChangeEvent, useState } from "react";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";

interface PdfUploadProps {
  onFileSelect?: (file: File) => void;
}

interface NotationData {
  text: string;
  patterns: string[];
  instruments: string[];
  breaks: string[];
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

export function PdfUpload({ onFileSelect }: PdfUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notationData, setNotationData] = useState<NotationData | null>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
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
      toast.success("PDF uploaded successfully");
      
      if (onFileSelect) {
        onFileSelect(file);
      }

      // Process the PDF
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
      if (processData.success && processData.data) {
        setNotationData(processData.data);
        toast.success("PDF processed successfully");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Operation failed. Please try again.");
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md space-y-6">
      <label 
        htmlFor="pdfUpload" 
        className="block text-lg font-medium text-gray-700 dark:text-gray-200 mb-4"
      >
        Upload PDF
      </label>
      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
        <div className="space-y-1 text-center">
          {isUploading || isProcessing ? (
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="h-12 w-12 text-gray-400 animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isUploading ? "Uploading..." : "Processing PDF..."}
              </p>
            </div>
          ) : (
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
          )}
          <div className="flex text-sm text-gray-600 dark:text-gray-400">
            <label
              htmlFor="pdfUpload"
              className="relative cursor-pointer rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
            >
              <span>Upload a file</span>
              <input
                id="pdfUpload"
                name="pdfUpload"
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={handleFileChange}
                disabled={isUploading || isProcessing}
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            PDF files only, max 10MB
          </p>
        </div>
      </div>

      {notationData && (
        <div className="mt-6 space-y-4">
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Extracted Information</h3>
            
            {notationData.patterns.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Patterns</h4>
                <div className="flex flex-wrap gap-2">
                  {notationData.patterns.map((pattern, index) => (
                    <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                      {pattern}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {notationData.instruments.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instruments</h4>
                <div className="flex flex-wrap gap-2">
                  {notationData.instruments.map((instrument, index) => (
                    <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                      {instrument}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {notationData.breaks.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Breaks</h4>
                <div className="flex flex-wrap gap-2">
                  {notationData.breaks.map((break_, index) => (
                    <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                      {break_}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Extracted Text</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {notationData.text}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 