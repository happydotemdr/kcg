/**
 * Error Message Utilities
 *
 * Provides user-friendly error messages for file upload and compression issues.
 * All messages are actionable and guide users toward resolution.
 */

import { getSupportedImageTypesString, MAX_BASE64_SIZE } from './fileValidation';

/**
 * Error codes for categorizing upload/compression failures
 * These codes help with debugging and error tracking
 */
export enum ErrorCode {
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNSUPPORTED_TYPE = 'UNSUPPORTED_TYPE',
  COMPRESSION_FAILED = 'COMPRESSION_FAILED',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  INVALID_FILE = 'INVALID_FILE',
}

/**
 * Format bytes to human-readable size string
 *
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "12.3 MB", "512 KB")
 */
export function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  const kb = bytes / 1024;

  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`;
  } else if (kb >= 1) {
    return `${kb.toFixed(2)} KB`;
  } else {
    return `${bytes} bytes`;
  }
}

/**
 * Generate error message for oversized files
 *
 * @param fileName - Name of the file
 * @param fileSize - Size of the file in bytes
 * @param maxSize - Maximum allowed size in bytes
 * @returns User-friendly error message with guidance
 *
 * Note: Console.error should be called separately with ErrorCode.FILE_TOO_LARGE
 */
export function getFileSizeErrorMessage(
  fileName: string,
  fileSize: number,
  maxSize: number = MAX_BASE64_SIZE
): string {
  const fileSizeFormatted = formatFileSize(fileSize);
  const maxSizeFormatted = formatFileSize(maxSize);

  if (fileSize > maxSize) {
    return `"${fileName}" (${fileSizeFormatted}) is too large. Maximum size is ${maxSizeFormatted}. Please try a smaller image or use a compression tool before uploading.`;
  }

  return `"${fileName}" (${fileSizeFormatted}) will be automatically compressed to meet the ${maxSizeFormatted} limit.`;
}

/**
 * Generate error message for compression failures
 *
 * @param fileName - Name of the file
 * @param error - Error object from compression attempt
 * @returns User-friendly error message with troubleshooting steps
 *
 * Note: Console.error should be called separately with ErrorCode.COMPRESSION_FAILED
 */
export function getCompressionErrorMessage(fileName: string, error: Error): string {
  const baseMessage = `Failed to compress "${fileName}".`;

  // Check for specific error patterns
  if (error.message.includes('canvas')) {
    return `${baseMessage} Your browser may not support image processing. Please try:\n• Using a different browser (Chrome, Firefox, or Safari recommended)\n• Compressing the image manually before uploading\n• Reducing the image dimensions`;
  }

  if (error.message.includes('memory')) {
    return `${baseMessage} The image is too large to process in your browser. Please try:\n• Using a smaller image\n• Compressing the image manually before uploading\n• Reducing the image dimensions to 2048x2048 or smaller`;
  }

  if (error.message.includes('Invalid file type')) {
    return `${baseMessage} ${error.message} Supported formats: ${getSupportedImageTypesString()}.`;
  }

  // Generic compression error
  return `${baseMessage} This may happen with corrupted or incompatible images.\n\nPlease try:\n• Using a different image\n• Re-saving the image in a standard format (JPEG or PNG)\n• Compressing the image manually before uploading\n• Using a different browser\n• Ensuring the image is a valid ${getSupportedImageTypesString()} file`;
}

/**
 * Generate error message for unsupported file types
 *
 * @param fileName - Name of the file
 * @param fileType - MIME type of the file
 * @returns User-friendly error message listing supported formats
 *
 * Note: Console.error should be called separately with ErrorCode.UNSUPPORTED_TYPE
 */
export function getUnsupportedTypeErrorMessage(fileName: string, fileType: string): string {
  const displayType = fileType || 'unknown format';
  return `"${fileName}" has an unsupported file type (${displayType}). Please upload an image in one of these formats: ${getSupportedImageTypesString()}.`;
}

/**
 * Generate success message for compression
 *
 * @param fileName - Name of the file
 * @param originalSize - Original file size in bytes
 * @param compressedSize - Compressed file size in bytes
 * @returns User-friendly success message with compression details
 */
export function getCompressionSuccessMessage(
  fileName: string,
  originalSize: number,
  compressedSize: number
): string {
  const originalFormatted = formatFileSize(originalSize);
  const compressedFormatted = formatFileSize(compressedSize);
  const savingsPercent = ((1 - compressedSize / originalSize) * 100).toFixed(0);

  return `"${fileName}" compressed from ${originalFormatted} to ${compressedFormatted} (${savingsPercent}% reduction).`;
}
