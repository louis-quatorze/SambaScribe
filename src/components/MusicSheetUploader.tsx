"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { Upload, FileType, Sliders } from "lucide-react";
import { AiNotationData } from "@/lib/types";

interface MusicSheetUploaderProps {
  onProcessComplete: (data: AiNotationData) => void;
  maxSizeMB?: number;
}

export function MusicSheetUploader({ 
  onProcessComplete, 
  maxSizeMB = 15 
}: MusicSheetUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [topP, setTopP] = useState<number>(1);
  const [topK, setTopK] = useState<number | undefined>(undefined);
  const [customPrompt, setCustomPrompt] = useState<string>("");
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
      toast.info("Analyzing music sheet with AI...");
      
      // Create form data with the file and parameters
      const formData = new FormData();
      formData.append("file", file);
      
      if (customPrompt) {
        formData.append("prompt", customPrompt);
      }
      
      // Add AI parameters if custom values are set
      if (temperature !== 0.7) {
        formData.append("temperature", temperature.toString());
      }
      
      if (topP !== 1) {
        formData.append("top_p", topP.toString());
      }
      
      if (topK !== undefined) {
        formData.append("top_k", topK.toString());
      }

      // Use our new API endpoint to process the file
      const response = await fetch("/api/analyze-sheet", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process file");
      }
      
      const data = await response.json();
      onProcessComplete(data);
      toast.success("Music sheet processed successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process file");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-4">
      <label
        htmlFor="sheet-upload"
        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 ${
          uploading ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <Upload className="w-8 h-8 mb-2 text-gray-500 dark:text-gray-400" />
          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
            {uploading ? "Analyzing..." : "Click to upload PDF music sheet"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            PDF up to {maxSizeMB}MB
          </p>
        </div>
        <input
          id="sheet-upload"
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </label>
      
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          <Sliders className="w-4 h-4 mr-1" />
          {showAdvanced ? "Hide advanced options" : "Show advanced options"}
        </button>
      </div>
      
      {showAdvanced && (
        <div className="p-4 space-y-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <label htmlFor="custom-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Custom Prompt
            </label>
            <textarea
              id="custom-prompt"
              className="w-full p-2 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="Optional: Provide specific instructions for the AI analysis"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
            />
          </div>
          
          <div>
            <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Temperature: {temperature}
            </label>
            <input
              id="temperature"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Controls randomness: 0 = deterministic, 1 = maximum creativity
            </p>
          </div>
          
          <div>
            <label htmlFor="top-p" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Top P: {topP}
            </label>
            <input
              id="top-p"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={topP}
              onChange={(e) => setTopP(parseFloat(e.target.value))}
              className="w-full"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Nucleus sampling: only consider tokens with top probability mass
            </p>
          </div>
          
          <div>
            <label htmlFor="top-k" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Top K: {topK ?? "Not set"}
            </label>
            <input
              id="top-k"
              type="range"
              min="1"
              max="100"
              step="1"
              value={topK ?? 40}
              onChange={(e) => setTopK(parseInt(e.target.value))}
              className="w-full"
            />
            <button 
              className="mt-1 text-xs text-blue-500 hover:text-blue-700" 
              onClick={() => setTopK(undefined)}
            >
              Reset (use model default)
            </button>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Only consider the top K tokens for each step
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 