"use client";

import { getUploadedFileUrl, extractFilename } from "@/lib/utils";
import { ExternalLink, Download, Eye } from "lucide-react";
import { useState } from "react";

interface FileLinkProps {
  filename: string;
  showPreview?: boolean;
  showDownload?: boolean;
  className?: string;
}

export function FileLink({
  filename,
  showPreview = true,
  showDownload = true,
  className = "",
}: FileLinkProps) {
  const [isHovered, setIsHovered] = useState(false);
  const fileUrl = getUploadedFileUrl(filename);
  const displayName = extractFilename(filename);
  const isPdf = filename.toLowerCase().endsWith(".pdf");

  return (
    <div
      className={`flex items-center space-x-2 rounded p-2 ${
        isHovered ? "bg-gray-100 dark:bg-gray-800" : ""
      } ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center flex-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
      >
        <ExternalLink className="h-4 w-4 mr-2" />
        <span className="truncate">{displayName}</span>
      </a>

      {showPreview && isPdf && (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
          title="Preview file"
        >
          <Eye className="h-5 w-5" />
        </a>
      )}

      {showDownload && (
        <a
          href={fileUrl}
          download={displayName}
          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
          title="Download file"
        >
          <Download className="h-5 w-5" />
        </a>
      )}
    </div>
  );
} 