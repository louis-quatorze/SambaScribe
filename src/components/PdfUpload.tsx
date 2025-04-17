"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { Upload } from "lucide-react";
import { AiNotationData } from "@/lib/services/aiPdfProcessor";

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
      toast.info("Uploading and analyzing PDF with AI...");
      
      // Step 1: Upload the file to get a URL
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      
      // Upload the file first to get a URL we can reference
      const uploadResponse = await fetch("/api/uploads", {
        method: "POST",
        body: uploadFormData,
      });
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || "Failed to upload file");
      }
      
      const uploadData = await uploadResponse.json();
      console.log("[PdfUpload] File uploaded successfully:", uploadData);
      
      if (!uploadData.fileUrl) {
        throw new Error("No file URL returned from upload");
      }
      
      // Step 2: Analyze with Claude
      try {
        toast.info("PDF uploaded. Now analyzing with Claude...");
        
        // Prepare prompt for Claude
        const prompt = "Analyze this samba music sheet PDF. Identify all rhythm patterns, breaks, and sections. Provide a detailed analysis of the notation and generate vocal mnemonics for each rhythm pattern. Format your response in a clear, structured way.";
        
        // Call our Claude API endpoint with the file URL
        const claudeResponse = await fetch("/api/parse-pdf", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pdfUrl: uploadData.fileUrl,
            prompt: prompt,
          }),
        });
        
        if (claudeResponse.ok) {
          const claudeData = await claudeResponse.json();
          console.log("[PdfUpload] Claude analysis successful");
          
          // Process Claude response into our expected format
          let analysis = "";
          
          if (Array.isArray(claudeData.analysis)) {
            claudeData.analysis.forEach((block: any) => {
              if (block.type === "text") {
                analysis += block.text;
              }
            });
          } else if (typeof claudeData.analysis === 'string') {
            analysis = claudeData.analysis;
          } else {
            analysis = JSON.stringify(claudeData.analysis);
          }
          
          // Extract mnemonics from the analysis text
          const mnemonics = extractMnemonicsFromText(analysis);
          
          // Create a valid AiNotationData object
          const aiData: AiNotationData = {
            filename: file.name,
            aiSummary: analysis,
            mnemonics: mnemonics.length ? mnemonics : [
              { text: "DUM ka DUM ka", pattern: "Basic Pattern", description: "Extracted from Claude analysis" }
            ]
          };
          
          onProcessComplete(aiData);
          toast.success("File analyzed with Claude AI successfully");
          return;
        } else {
          console.error("[PdfUpload] Claude analysis failed, will try fallback");
          // Continue to fallback methods below
        }
      } catch (claudeError) {
        console.error("[PdfUpload] Error with Claude analysis:", claudeError);
        // Continue to fallback method
      }
      
      // Step 3: Fall back to original method if Claude fails
      toast.info("Continuing with standard AI analysis...");
      
      // Create form data with the file for the original endpoint
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
      toast.success("File processed successfully with standard AI");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process file");
    } finally {
      setUploading(false);
    }
  };

  // Helper function to extract mnemonics from Claude's response text
  const extractMnemonicsFromText = (text: string): Array<{text: string, pattern?: string, description?: string}> => {
    const mnemonics = [];
    
    // Try to extract pattern-mnemonic pairs using regex
    const patternRegex = /["']([^"']+)["']:\s*["']([^"']+)["']/g;
    const matches = text.matchAll(patternRegex);
    
    for (const match of Array.from(matches)) {
      if (match[1] && match[2]) {
        mnemonics.push({
          pattern: match[1].trim(),
          text: match[2].trim(),
          description: "Extracted from Claude analysis"
        });
      }
    }
    
    // Look for mnemonic patterns like "DUM ka DUM ka"
    const soundPatternRegex = /\b([A-Z]{2,}\s+[a-z]+(\s+[A-Z]{2,}\s+[a-z]+)+)\b/g;
    const soundMatches = text.matchAll(soundPatternRegex);
    
    for (const match of Array.from(soundMatches)) {
      if (match[1] && !mnemonics.some(m => m.text === match[1])) {
        mnemonics.push({
          text: match[1].trim(),
          pattern: "Sound Pattern",
          description: "Vocal pattern from analysis"
        });
      }
    }
    
    // If we couldn't extract any mnemonics, check if there are sections starting with "Mnemonic"
    if (mnemonics.length === 0) {
      const lines = text.split('\n');
      let currentPattern = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Look for pattern names
        if (line.toLowerCase().includes('pattern') || 
            line.toLowerCase().includes('section') || 
            line.toLowerCase().includes('break')) {
          currentPattern = line.replace(/[:;.,]$/, '').trim();
        }
        
        // Look for lines that appear to be mnemonics
        if (line.match(/[A-Z]{2,}/) && 
            line.match(/\b[a-z]+\b/) && 
            !line.match(/^[a-z]/) && 
            line.length < 50) {
          mnemonics.push({
            text: line,
            pattern: currentPattern || "Rhythm Pattern",
            description: "Identified vocal pattern"
          });
        }
      }
    }
    
    // If still empty, try to find any all-caps words that might be mnemonics
    if (mnemonics.length === 0) {
      const allCapsRegex = /\b([A-Z]{2,}([\s-][A-Z]{2,})*)\b/g;
      const allCapsMatches = text.matchAll(allCapsRegex);
      
      for (const match of Array.from(allCapsMatches)) {
        if (match[1] && match[1].length > 3) {
          mnemonics.push({
            text: match[1],
            pattern: "Sound Pattern",
            description: "Emphasized sound"
          });
        }
      }
    }
    
    return mnemonics;
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