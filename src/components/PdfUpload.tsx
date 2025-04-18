"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { UploadCloud, Loader2 } from "lucide-react";
import { trackFileUpload } from "@/lib/analytics";

interface PdfUploadProps {
  onUploadComplete: (uploadedUrl: string) => void;
  disabled?: boolean;
  maxSizeMB?: number;
}

export function PdfUpload({ onUploadComplete, disabled = false, maxSizeMB = 10 }: PdfUploadProps) {
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
      toast.info("Uploading PDF...");
      
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append("file", file);
      
      // Upload the file to our API route
      const uploadResponse = await fetch("/api/upload-pdf", {
        method: "POST",
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || "Failed to upload file");
      }
      
      const uploadData = await uploadResponse.json();
      
      if (!uploadData.fileUrl) {
        throw new Error("No file URL returned from upload");
      }
      
      // Track the successful file upload
      trackFileUpload('pdf', file.size);
      
      toast.success("PDF uploaded successfully");
      onUploadComplete(uploadData.fileUrl);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center justify-center w-full">
      <label
        htmlFor="pdf-upload"
        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 ${
          uploading || disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {uploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-8 h-8 mb-2 text-gray-500 dark:text-gray-400 animate-spin" />
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                Uploading...
              </p>
            </div>
          ) : (
            <>
              <UploadCloud className="w-8 h-8 mb-2 text-gray-500 dark:text-gray-400" />
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                Click to upload PDF
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                PDF up to {maxSizeMB}MB
              </p>
            </>
          )}
        </div>
        <input
          id="pdf-upload"
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading || disabled}
        />
      </label>
    </div>
  );
} 