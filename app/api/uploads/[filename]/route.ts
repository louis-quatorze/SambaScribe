import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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

export function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;
    
    // Check that the filename is set
    if (!filename) {
      return NextResponse.json(
        { error: "Filename is required" },
        { status: 400 }
      );
    }
    
    // Sanitize the filename to prevent directory traversal attacks
    const sanitizedFilename = filename.replace(/^.*[\\\/]/, '');
    
    // Get the full path to the file
    const filePath = path.join(process.cwd(), "uploads", sanitizedFilename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }
    
    // Read the file synchronously
    const fileBuffer = fs.readFileSync(filePath);
    
    // Get file extension to determine content type
    const ext = path.extname(sanitizedFilename).toLowerCase();
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
    return NextResponse.json(
      { error: "Error serving file" },
      { status: 500 }
    );
  }
} 