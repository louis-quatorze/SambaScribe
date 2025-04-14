import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/upload";

export const config = {
  api: {
    bodyParser: false,
  },
};

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

    const result = await uploadFile(file);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Upload failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: result.url,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
