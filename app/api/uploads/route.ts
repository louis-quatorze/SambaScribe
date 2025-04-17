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