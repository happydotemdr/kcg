/**
 * Image Compression Utilities
 *
 * Handles client-side image compression to meet Claude API's 5 MB base64 limit.
 * Uses dimension reduction and quality adjustment for optimal compression.
 */

import { formatFileSize } from './errorMessages';

export const DEFAULT_MAX_DIMENSION = 2048;
export const DEFAULT_TARGET_SIZE_MB = 3.5;
export const MIN_QUALITY = 0.1;
export const QUALITY_STEP = 0.1;

export interface CompressionOptions {
  maxDimension?: number;
  targetSizeMB?: number;
  grayscale?: boolean;
}

export interface CompressionMetadata {
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  compressionRatio: number;
}

export interface CompressionResult {
  blob: Blob;
  metadata: CompressionMetadata;
}

/**
 * Calculate new dimensions maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxDimension: number
): { width: number; height: number } {
  if (originalWidth <= maxDimension && originalHeight <= maxDimension) {
    return { width: originalWidth, height: originalHeight };
  }

  const aspectRatio = originalWidth / originalHeight;

  if (originalWidth > originalHeight) {
    return {
      width: maxDimension,
      height: Math.round(maxDimension / aspectRatio),
    };
  } else {
    return {
      width: Math.round(maxDimension * aspectRatio),
      height: maxDimension,
    };
  }
}

/**
 * Compress image to meet target size requirements
 *
 * @param file - Source image file
 * @param options - Compression options
 * @returns Promise resolving to compressed blob and metadata
 * @throws Error if file is not a valid image or compression fails
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxDimension = DEFAULT_MAX_DIMENSION,
    targetSizeMB = DEFAULT_TARGET_SIZE_MB,
    grayscale = false,
  } = options;

  if (!file.type.startsWith('image/')) {
    throw new Error('Invalid file type. Expected an image file.');
  }

  const targetSizeBytes = targetSizeMB * 1024 * 1024;
  const originalSize = file.size;
  let canvas: HTMLCanvasElement | null = null;

  try {
    // Load image as ImageBitmap for efficient processing
    const imageBitmap = await createImageBitmap(file);
    const { width: originalWidth, height: originalHeight } = imageBitmap;

    // Calculate new dimensions
    const { width, height } = calculateDimensions(
      originalWidth,
      originalHeight,
      maxDimension
    );

    // Create canvas and draw resized image
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      imageBitmap.close();
      throw new Error('Failed to get canvas 2D context.');
    }

    // Apply grayscale filter if requested
    if (grayscale) {
      ctx.filter = 'grayscale(100%)';
    }

    // Draw resized image
    ctx.drawImage(imageBitmap, 0, 0, width, height);

    // Clean up ImageBitmap
    imageBitmap.close();

    // Progressive quality reduction until target size is met
    let quality = 0.9;
    let blob: Blob | null = null;
    const MAX_COMPRESSION_ATTEMPTS = 10;
    let compressionAttempts = 0;

    while (quality >= MIN_QUALITY && compressionAttempts < MAX_COMPRESSION_ATTEMPTS) {
      compressionAttempts++;

      // Log compression attempt for debugging
      console.log(`[Compression] Attempt ${compressionAttempts}: quality=${quality.toFixed(1)}, target=${formatFileSize(targetSizeBytes)}`);

      blob = await new Promise<Blob | null>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Canvas toBlob timeout after 5 seconds'));
        }, 5000);

        canvas!.toBlob((result) => {
          clearTimeout(timeout);
          resolve(result);
        }, 'image/jpeg', quality);
      });

      if (!blob) {
        console.error('[Compression] toBlob returned null:', {
          quality,
          width,
          height,
          attempt: compressionAttempts,
        });
        throw new Error(
          `Failed to create compressed blob at quality ${quality.toFixed(1)}. ` +
          `This may be due to browser limitations or an unsupported image format.`
        );
      }

      // Log compression result
      console.log(`[Compression] Attempt ${compressionAttempts}: produced ${formatFileSize(blob.size)}`);

      // Check if we've met the target size
      if (blob.size <= targetSizeBytes) {
        console.log(`[Compression] ✓ Target size reached after ${compressionAttempts} attempts`);
        break;
      }

      // Reduce quality for next iteration
      quality -= QUALITY_STEP;
    }

    // Warn if target not reached
    if (blob && blob.size > targetSizeBytes) {
      console.warn('[Compression] Target size not reached after maximum attempts:', {
        finalSize: formatFileSize(blob.size),
        targetSize: formatFileSize(targetSizeBytes),
        compressionRatio: (blob.size / file.size).toFixed(2),
        attempts: compressionAttempts,
      });
    }

    if (!blob) {
      throw new Error('Compression failed to produce a valid blob.');
    }

    const compressedSize = blob.size;
    const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1;

    return {
      blob,
      metadata: {
        originalSize,
        compressedSize,
        width,
        height,
        compressionRatio,
      },
    };
  } catch (error) {
    // Clean up canvas if it exists
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }

    if (error instanceof Error) {
      throw new Error(`Image compression failed: ${error.message}`);
    }
    throw new Error('Image compression failed with an unknown error.');
  }
}
