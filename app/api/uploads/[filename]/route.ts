import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: { filename: string } }
) {
  try {
    // Properly handle async params by awaiting them
    const params = context.params;
    const filename = params.filename;
    
    // Sanitize the filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    
    // Get the file path
    const filePath = path.join(process.cwd(), "uploads", sanitizedFilename);
    
    // Check if the file exists
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }
    
    // Read the file
    const file = await fs.readFile(filePath);
    
    // Determine content type based on file extension
    const ext = path.extname(sanitizedFilename).toLowerCase();
    let contentType = "application/octet-stream";
    
    if (ext === ".pdf") {
      contentType = "application/pdf";
    } else if (ext === ".jpg" || ext === ".jpeg") {
      contentType = "image/jpeg";
    } else if (ext === ".png") {
      contentType = "image/png";
    }
    
    // Return the file
    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${sanitizedFilename}"`,
      },
    });
  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 }
    );
  }
} 