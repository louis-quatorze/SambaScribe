import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function uploadFile(file: File): Promise<UploadResult> {
  try {
    if (!BUCKET_NAME) {
      throw new Error("AWS S3 bucket name not configured");
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: "File size exceeds 10MB limit",
      };
    }

    const validTypes = ["application/pdf"];
    if (!validTypes.includes(file.type)) {
      return {
        success: false,
        error: "Invalid file type. Please upload a PDF file",
      };
    }

    const key = `uploads/${Date.now()}-${file.name}`;
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: file.type,
    });

    // Get pre-signed URL for direct upload
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // Upload file using pre-signed URL
    const response = await fetch(signedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to upload to S3");
    }

    // Generate public URL
    const fileUrl = `https://${BUCKET_NAME}.s3.${
      process.env.AWS_REGION || "us-east-1"
    }.amazonaws.com/${key}`;

    return {
      success: true,
      url: fileUrl,
    };
  } catch (error) {
    console.error("Upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
} 