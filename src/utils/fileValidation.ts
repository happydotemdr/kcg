/**
 * File Validation Utilities
 *
 * Validates image files for Claude API compatibility.
 * Checks file size, type, and base64 encoding overhead.
 */

// Claude API limits: 5 MB for base64-encoded images
// Base64 adds ~33% overhead, so raw files must be ≤3.76 MB
export const MAX_RAW_FILE_SIZE = 3.76 * 1024 * 1024; // bytes
export const MAX_BASE64_SIZE = 5 * 1024 * 1024; // bytes
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

export type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];

export interface FileSizeValidationResult {
  valid: boolean;
  error?: string;
  needsCompression: boolean;
}

/**
 * Validate if file size is within acceptable limits
 *
 * @param file - File to validate
 * @returns Validation result with compression recommendation
 */
export function validateFileSize(file: File): FileSizeValidationResult {
  const fileSize = file.size;

  if (fileSize > MAX_BASE64_SIZE) {
    return {
      valid: false,
      error: `File is too large (${(fileSize / (1024 * 1024)).toFixed(2)} MB). Even with compression, it may exceed the 5 MB limit.`,
      needsCompression: true,
    };
  }

  if (fileSize > MAX_RAW_FILE_SIZE) {
    return {
      valid: true,
      error: undefined,
      needsCompression: true,
    };
  }

  return {
    valid: true,
    error: undefined,
    needsCompression: false,
  };
}

/**
 * Calculate estimated base64-encoded size
 *
 * Base64 encoding adds approximately 33% overhead
 *
 * @param bytes - Raw file size in bytes
 * @returns Estimated base64 size in bytes
 */
export function calculateBase64Size(bytes: number): number {
  return Math.ceil(bytes * 1.33);
}

/**
 * Type guard to check if file is a supported image type
 *
 * @param file - File to check
 * @returns True if file type is supported
 */
export function isImageFile(file: File): file is File & { type: SupportedImageType } {
  return SUPPORTED_IMAGE_TYPES.includes(file.type as SupportedImageType);
}

/**
 * Get list of supported image types as human-readable string
 *
 * @returns Comma-separated list of supported formats
 */
export function getSupportedImageTypesString(): string {
  return SUPPORTED_IMAGE_TYPES.map((type) => type.replace('image/', '').toUpperCase()).join(
    ', '
  );
}
