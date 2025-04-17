"use client";

import { useState, useEffect } from "react";
import { FileLink } from "./FileLink";
import { Loader } from "lucide-react";

interface FileListProps {
  className?: string;
}

export function FileList({ className = "" }: FileListProps) {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFiles() {
      try {
        setLoading(true);
        const response = await fetch("/api/uploads", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch files");
        }

        const data = await response.json();
        setFiles(data.files || []);
        setError(null);
      } catch (error) {
        console.error("Error fetching files:", error);
        setError("Failed to load files. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchFiles();
  }, []);

  if (loading) {
    return (
      <div className={`flex justify-center p-6 ${className}`}>
        <Loader className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 text-red-500 ${className}`}>
        <p>{error}</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className={`p-4 text-gray-500 ${className}`}>
        <p>No files available.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <h2 className="text-xl font-medium mb-4">Uploaded Files</h2>
      {files.map((filename) => (
        <FileLink key={filename} filename={filename} />
      ))}
    </div>
  );
} 