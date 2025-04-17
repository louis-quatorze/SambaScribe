import fs from "fs";
import path from "path";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";

// Define the files route metadata
export const metadata = {
  title: "File Viewer",
  description: "View uploaded files",
};

// Generate static paths for the files that exist at build time
export function generateStaticParams() {
  // This would typically list all files in the uploads directory
  // but for performance in large directories, we'll return an empty array
  // and let the page handle the file lookup at request time
  return [];
}

export default function FilePage({ params }: { params: { filename: string } }) {
  const { filename } = params;
  
  // Sanitize the filename to prevent directory traversal attacks
  const sanitizedFilename = path.basename(filename);
  
  // Get the file path
  const filePath = path.join(process.cwd(), "uploads", sanitizedFilename);
  
  // Check if the file exists
  if (!fs.existsSync(filePath)) {
    notFound();
  }
  
  // Get the file extension
  const ext = path.extname(sanitizedFilename).toLowerCase();
  
  // For PDFs, we can embed them directly
  if (ext === ".pdf") {
    // Return a page that embeds the PDF
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">{sanitizedFilename}</h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <iframe 
            src={`/api/uploads/${encodeURIComponent(sanitizedFilename)}`}
            className="w-full h-screen"
            title={sanitizedFilename}
          />
        </div>
      </div>
    );
  }
  
  // For other file types, redirect to the API
  redirect(`/api/uploads/${encodeURIComponent(sanitizedFilename)}`);
}