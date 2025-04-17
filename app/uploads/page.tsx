import fs from "fs";
import path from "path";
import Link from "next/link";
import { FileIcon, ArrowUpRight } from "lucide-react";
import { getUploadedFileUrl } from "@/lib/utils";

export const metadata = {
  title: "Uploaded Files",
  description: "View and manage uploaded files",
};

// This function runs on the server at build time
export function generateStaticParams() {
  return [];
}

export default function UploadsPage() {
  // Read the uploads directory (at request time)
  const uploadsDir = path.join(process.cwd(), "uploads");
  let files: string[] = [];
  
  try {
    if (fs.existsSync(uploadsDir)) {
      files = fs.readdirSync(uploadsDir)
        .filter(file => !fs.statSync(path.join(uploadsDir, file)).isDirectory())
        .sort((a, b) => {
          // Sort by modification time (newest first)
          const statA = fs.statSync(path.join(uploadsDir, a));
          const statB = fs.statSync(path.join(uploadsDir, b));
          return statB.mtime.getTime() - statA.mtime.getTime();
        });
    }
  } catch (error) {
    console.error("Error reading uploads directory:", error);
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Uploaded Files</h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        {files.length === 0 ? (
          <p className="text-gray-500">No files available.</p>
        ) : (
          <div className="space-y-2">
            {files.map((filename) => {
              const fileUrl = getUploadedFileUrl(filename);
              return (
                <div key={filename} className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <FileIcon className="h-5 w-5 text-gray-400" />
                  <Link 
                    href={`/files/${encodeURIComponent(filename)}`}
                    className="flex-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {filename}
                  </Link>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    title="Open in new tab"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 