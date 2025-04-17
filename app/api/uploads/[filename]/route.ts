import { NextRequest } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

// Content-type mapping based on file extensions
const contentTypeMap: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", 
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
};

// Use a dynamic route handler that works with both Node.js and Edge runtime
export async function GET(
  request: NextRequest,
  context: { params: { filename: string } }
) {
  const filename = context.params.filename;
  
  try {
    // Check that the filename is set
    if (!filename) {
      return new Response("Filename is required", { status: 400 });
    }
    
    // Sanitize the filename to prevent directory traversal attacks
    const sanitizedFilename = filename.replace(/^.*[\\\/]/, '');
    
    // Get the full path to the file
    const filePath = join(process.cwd(), "uploads", sanitizedFilename);
    
    // Read the file synchronously (for simplicity)
    let fileBuffer;
    try {
      fileBuffer = readFileSync(filePath);
    } catch (err) {
      return new Response("File not found", { status: 404 });
    }
    
    // Get file extension to determine content type
    const ext = (sanitizedFilename.match(/\.[^.]+$/) || [""])[0].toLowerCase();
    const contentType = contentTypeMap[ext] || "application/octet-stream";
    
    // Create response with appropriate headers
    return new Response(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${sanitizedFilename}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error serving file:", error);
    return new Response("Error serving file", { status: 500 });
  }
} 