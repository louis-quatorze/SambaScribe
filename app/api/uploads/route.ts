import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    // Get the uploads directory path
    const uploadsDir = path.join(process.cwd(), "uploads");
    
    // Read all files in the directory
    const files = await fs.readdir(uploadsDir);
    
    // Filter out any directories (only return files)
    const fileStats = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(uploadsDir, file);
        const stat = await fs.stat(filePath);
        return {
          name: file,
          isDirectory: stat.isDirectory(),
          size: stat.size,
          createdAt: stat.birthtime,
          modifiedAt: stat.mtime,
        };
      })
    );
    
    // Filter out directories
    const fileList = fileStats
      .filter((file) => !file.isDirectory)
      .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime()) // Sort by most recent
      .map((file) => file.name);
    
    return NextResponse.json({
      files: fileList,
    });
  } catch (error) {
    console.error("[/api/uploads] Error:", error);
    return NextResponse.json(
      { error: "Failed to list files" },
      { status: 500 }
    );
  }
} 

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }
    
    // Check file type
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are supported" },
        { status: 400 }
      );
    }
    
    // Generate a unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
    const filename = `${timestamp}-${originalName}`;
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), "uploads");
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
    } catch (mkdirError) {
      console.error("[/api/uploads] Error creating uploads directory:", mkdirError);
    }
    
    // Write file to disk
    const filePath = path.join(uploadsDir, filename);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, fileBuffer);
    
    // Generate URL for the uploaded file
    const fileUrl = `/api/uploads/${filename}`;
    
    console.log(`[/api/uploads] File uploaded: ${filename} (${fileBuffer.length} bytes)`);
    
    return NextResponse.json({
      success: true,
      filename,
      fileUrl,
      size: fileBuffer.length
    });
  } catch (error) {
    console.error("[/api/uploads] Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
} 