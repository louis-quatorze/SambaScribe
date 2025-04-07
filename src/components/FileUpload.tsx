"use client";

import { useState } from "react";

export default function FileUpload() {
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file");
      return;
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds the limit");
      return;
    }

    setError(null);
    // TODO: Handle file upload
  };

  return (
    <div className="space-y-4">
      <label
        htmlFor="pdfUpload"
        className="block text-sm font-medium text-gray-700"
      >
        Upload PDF
      </label>
      <input
        id="pdfUpload"
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-full file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100"
      />
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
} 