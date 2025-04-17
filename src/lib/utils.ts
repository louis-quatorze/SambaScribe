import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a URL for accessing a file from the uploads directory
 * @param filename The name of the file in the uploads directory
 * @returns The URL to access the file through the API
 */
export function getUploadedFileUrl(filename: string): string {
  // Get the base path from the environment or default to empty string
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  
  // Ensure filename is properly encoded
  const encodedFilename = encodeURIComponent(filename);
  
  // Return the full URL path including base path
  return `${basePath}/api/uploads/${encodedFilename}`;
}

/**
 * Extract the filename from a full path or URL
 * @param pathOrUrl A file path or URL
 * @returns The base filename
 */
export function extractFilename(pathOrUrl: string): string {
  return pathOrUrl.split('/').pop() || '';
}
