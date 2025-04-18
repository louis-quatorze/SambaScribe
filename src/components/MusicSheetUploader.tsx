"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { Upload, FileType, Sliders, Loader } from "lucide-react";
import { AiNotationData } from "@/lib/types";

interface MusicSheetUploaderProps {
  onProcessComplete: (data: AiNotationData) => void;
  onProcessStart?: () => void;
  maxSizeMB?: number;
}

export function MusicSheetUploader({ 
  onProcessComplete,
  onProcessStart,
  maxSizeMB = 15 
}: MusicSheetUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [temperature, setTemperature] = useState<number>(0.1);
  const [topP, setTopP] = useState<number>(0.8);
  const [topK, setTopK] = useState<number | undefined>(undefined);
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const maxSize = maxSizeMB * 1024 * 1024; // Convert to bytes

  const defaultPrompt = "Act as a music analyst for a samba piece. Your task is to offer a concise summary of the composition, identifying its style, the type of samba (if recognizable), and the general instrumentation or ensemble setup. Pinpoint rhythm patterns, breaks, section labels, and captions from the file, and outline the overall structure and flow of the piece based on these elements. For each unique rhythm or break, devise a mnemonic entry. Deliver your complete response in the provided JSON format: {\"summary\": \"brief piece description and structure\", \"mnemonics\": [{\"pattern\": \"rhythm description\", \"mnemonic\": \"memorable phrase\", \"description\": \"relation of phrase to rhythm\"}]}. Each mnemonic should assist performers in internalizing the rhythm, be vivid, amusing, easy to remember, and encapsulate the feel or phrasing of the pattern.";

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
    // Call the onProcessStart callback if provided
    if (onProcessStart) {
      onProcessStart();
    }
    
    try {
      toast.info("Analyzing music sheet with AI...");
      
      // Create form data with the file and parameters
      const formData = new FormData();
      formData.append("file", file);
      
      // Use custom prompt if provided, otherwise use the default samba analysis prompt
      const promptToUse = customPrompt || defaultPrompt;
      formData.append("prompt", promptToUse);
      
      console.log("[MusicSheetUploader] Using prompt:", promptToUse);
      console.log("[MusicSheetUploader] AI parameters:", { 
        temperature, 
        topP, 
        topK 
      });
      
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
          {uploading ? (
            <div className="flex flex-col items-center">
              <Loader className="w-8 h-8 mb-2 text-gray-500 dark:text-gray-400 animate-spin" />
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                Analyzing... This may take a moment
              </p>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 mb-2 text-gray-500 dark:text-gray-400" />
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                Click to upload PDF music sheet
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                PDF up to {maxSizeMB}MB
              </p>
            </>
          )}
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
          disabled={uploading}
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
              placeholder="Optional: Override the default samba analysis prompt"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              disabled={uploading}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Leave empty to use the default samba analysis prompt
            </p>
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
              disabled={uploading}
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
              disabled={uploading}
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
              disabled={uploading}
            />
            <button 
              className="mt-1 text-xs text-blue-500 hover:text-blue-700" 
              onClick={() => setTopK(undefined)}
              disabled={uploading}
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