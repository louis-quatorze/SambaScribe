"use client";

import { useState, useEffect } from "react";
import { PdfAnalyzer } from "@/components/PdfAnalyzer";
import { toast } from "react-toastify";

export default function PdfParserPage() {
  const [pdfFiles, setPdfFiles] = useState<string[]>([]);
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch the list of available PDFs
    const fetchPdfs = async () => {
      try {
        const response = await fetch('/api/uploads');
        if (!response.ok) {
          throw new Error('Failed to fetch PDFs');
        }
        const data = await response.json();
        setPdfFiles(data.files.filter((file: string) => file.toLowerCase().endsWith('.pdf')));
      } catch (error) {
        console.error('Error fetching PDFs:', error);
        toast.error('Failed to load PDF files');
      } finally {
        setLoading(false);
      }
    };

    fetchPdfs();
  }, []);

  const handlePdfSelect = (pdf: string) => {
    setSelectedPdf(pdf);
  };

  const getPdfUrl = (filename: string) => {
    return `${window.location.origin}/api/uploads/${filename}`;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">PDF Analysis with Claude</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Select a PDF</h2>
        {loading ? (
          <p>Loading PDF files...</p>
        ) : pdfFiles.length === 0 ? (
          <p>No PDF files found. Please upload a PDF first.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {pdfFiles.map((pdf) => (
              <div
                key={pdf}
                className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  selectedPdf === pdf ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
                onClick={() => handlePdfSelect(pdf)}
              >
                <p className="truncate">{pdf}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedPdf && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Analyze PDF</h2>
          <PdfAnalyzer pdfUrl={getPdfUrl(selectedPdf)} />
        </div>
      )}
    </div>
  );
} 