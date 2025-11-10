/**
 * Document Upload Configuration Constants
 */

/**
 * Maximum number of files that can be uploaded at once
 */
export const MAX_FILES_PER_UPLOAD = 3;

/**
 * Maximum file size in bytes (10MB)
 */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Maximum file size display string
 */
export const MAX_FILE_SIZE_DISPLAY = '10MB';

/**
 * Supported image MIME types for Claude Vision API
 */
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

/**
 * Supported file extensions for upload
 */
export const SUPPORTED_FILE_EXTENSIONS = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.heic',
  '.docx',
  '.txt',
  'image/*',
] as const;

/**
 * Duration to show error indicators before auto-clearing (milliseconds)
 */
export const ERROR_DISPLAY_DURATION_MS = 3000;

/**
 * Duration to show processing indicator after sending to Claude (milliseconds)
 */
export const PROCESSING_INDICATOR_DURATION_MS = 1000;

/**
 * Default number of days to fetch for recent documents
 */
export const DEFAULT_RECENT_DAYS = 7;

/**
 * Refresh interval for document history (milliseconds)
 * Set to null for manual refresh only
 */
export const DOCUMENT_HISTORY_REFRESH_INTERVAL_MS = null;

/**
 * Maximum number of documents to fetch in history
 */
export const MAX_DOCUMENTS_IN_HISTORY = 50;
