"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { Upload } from "lucide-react";
import { AiNotationData } from "@/lib/types";

interface PdfUploadProps {
  onProcessComplete: (data: AiNotationData) => void;
  maxSizeMB?: number;
}

export function PdfUpload({ onProcessComplete, maxSizeMB = 10 }: PdfUploadProps) {
  const [uploading, setUploading] = useState(false);
  const maxSize = maxSizeMB * 1024 * 1024; // Convert to bytes

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      toast.error(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    setUploading(true);
    try {
      toast.info("Analyzing PDF with AI...");
      
      // Create form data with the file
      const formData = new FormData();
      formData.append("file", file);
      formData.append("prompt", "Analyze this samba notation and provide mnemonics for the patterns");
      
      // Use the server-side API endpoint to process the file
      const response = await fetch("/api/generate-mnemonics", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process file");
      }
      
      const data = await response.json();
      onProcessComplete(data);
      toast.success("File processed successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process file");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center justify-center w-full">
      <label
        htmlFor="pdf-upload"
        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
          uploading ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <Upload className="w-8 h-8 mb-2 text-gray-500" />
          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
            {uploading ? "Uploading..." : "Click to upload PDF"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            PDF up to {maxSizeMB}MB
          </p>
        </div>
        <input
          id="pdf-upload"
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </label>
    </div>
  );
} 