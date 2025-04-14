import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// The S3 client will automatically use the best available credentials
const s3 = new S3Client({
  region: process.env.AWS_S3_REGION,
});

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | Blob | string,
) {
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: key,
        Body: body,
        // Set appropriate ACL based on your needs
        ACL: 'public-read', // Makes uploaded files publicly readable
        ContentDisposition: 'inline', // Allows browsers to display the file
      }),
    );
    return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${key}`;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error('Failed to upload file to S3');
  }
}
