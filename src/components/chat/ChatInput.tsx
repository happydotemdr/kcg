/**
 * ChatInput Component
 * Message composition with image upload support
 */

import React, { useState, useRef, useCallback } from 'react';
import { compressImage } from '../../utils/imageCompression';
import { validateFileSize } from '../../utils/fileValidation';
import { getFileSizeErrorMessage, getCompressionErrorMessage, formatFileSize } from '../../utils/errorMessages';

interface ImageAttachment {
  data: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  preview: string;
  name: string;
  compressionStats?: string;
}

interface ChatInputProps {
  onSend: (message: string, images: ImageAttachment[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Type your message...',
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, []);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: ImageAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file`);
        continue;
      }

      // Validate supported formats
      const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!supportedTypes.includes(file.type)) {
        alert(`${file.name} is not a supported image format (JPEG, PNG, GIF, WebP)`);
        continue;
      }

      // Validate file size
      const sizeValidation = validateFileSize(file);
      if (!sizeValidation.valid && !sizeValidation.needsCompression) {
        alert(getFileSizeErrorMessage(file.name, file.size));
        continue;
      }

      // Compress image if needed (file > 3.76 MB or validation suggests compression)
      let preview: string;
      let base64Data: string;
      let compressionStats: string | undefined;

      if (sizeValidation.needsCompression) {
        let previewUrl: string | undefined;

        try {
          // Compress the image
          const compressionResult = await compressImage(file);
          const compressedBlob = compressionResult.blob;
          const metadata = compressionResult.metadata;

          // Create compression stats string
          const originalFormatted = formatFileSize(metadata.originalSize);
          const compressedFormatted = formatFileSize(metadata.compressedSize);
          const savingsPercent = ((1 - metadata.compressionRatio) * 100).toFixed(0);
          compressionStats = `Original: ${originalFormatted} → Compressed: ${compressedFormatted} (${savingsPercent}% smaller)`;

          // Create preview URL (track it for cleanup)
          previewUrl = URL.createObjectURL(compressedBlob);

          try {
            // Extract base64 from compressed blob with enhanced error handling
            const reader = new FileReader();
            const imageData = await new Promise<string>((resolve, reject) => {
              const timeout = setTimeout(() => {
                reader.abort();
                reject(new Error('File reading timed out after 10 seconds'));
              }, 10000);

              reader.onload = (e) => {
                clearTimeout(timeout);
                const result = e.target?.result;

                if (!result) {
                  reject(new Error('FileReader returned null or undefined'));
                  return;
                }

                if (typeof result !== 'string') {
                  reject(new Error('FileReader result is not a string'));
                  return;
                }

                if (!result.startsWith('data:image/')) {
                  reject(new Error('Invalid image data URL'));
                  return;
                }

                resolve(result);
              };

              reader.onerror = () => {
                clearTimeout(timeout);
                const error = reader.error || new Error('Unknown FileReader error');
                reject(new Error(`Failed to read compressed image: ${error.message}`));
              };

              reader.readAsDataURL(compressedBlob);
            });

            // Validate data URL format
            const parts = imageData.split(',');
            if (parts.length !== 2) {
              throw new Error('Invalid data URL format');
            }

            base64Data = parts[1];
            preview = previewUrl;  // Success - keep the URL

          } catch (readerError) {
            // CRITICAL FIX: Clean up blob URL before re-throwing
            if (previewUrl) {
              URL.revokeObjectURL(previewUrl);
            }

            console.error('[ChatInput] FileReader error:', {
              fileName: file.name,
              compressedSize: compressedBlob.size,
              error: readerError instanceof Error ? readerError.message : 'Unknown error',
              stack: readerError instanceof Error ? readerError.stack : undefined,
            });

            throw readerError;  // Re-throw to outer catch
          }
        } catch (error) {
          const errorObj = error instanceof Error ? error : new Error('Unknown compression error');
          console.error('[ChatInput] Compression or FileReader failed:', {
            fileName: file.name,
            fileSize: file.size,
            error: errorObj.message,
            stack: errorObj.stack,
          });
          alert(getCompressionErrorMessage(file.name, errorObj));
          continue;
        }
      } else {
        // Use original file without compression
        try {
          const reader = new FileReader();
          const imageData = await new Promise<string>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reader.abort();
              reject(new Error('File reading timed out after 10 seconds'));
            }, 10000);

            reader.onload = (e) => {
              clearTimeout(timeout);
              const result = e.target?.result;

              if (!result) {
                reject(new Error('FileReader returned null or undefined'));
                return;
              }

              if (typeof result !== 'string') {
                reject(new Error('FileReader result is not a string (expected base64 data URL)'));
                return;
              }

              if (!result.startsWith('data:image/')) {
                reject(new Error('FileReader result is not a valid image data URL'));
                return;
              }

              resolve(result);
            };

            reader.onerror = () => {
              clearTimeout(timeout);
              const error = reader.error || new Error('Unknown FileReader error');
              reject(new Error(`Failed to read file: ${error.message}`));
            };

            reader.onabort = () => {
              clearTimeout(timeout);
              reject(new Error('File reading was aborted'));
            };

            reader.readAsDataURL(file);
          });

          // Validate data URL format before splitting
          const parts = imageData.split(',');
          if (parts.length !== 2) {
            throw new Error('Invalid data URL format - expected "data:image/...;base64,..."');
          }

          // Extract base64 data (remove data:image/...;base64, prefix)
          base64Data = parts[1];
          preview = imageData;

        } catch (readerError) {
          console.error('[ChatInput] FileReader error (non-compressed path):', {
            fileName: file.name,
            fileSize: file.size,
            error: readerError instanceof Error ? readerError.message : 'Unknown error',
            stack: readerError instanceof Error ? readerError.stack : undefined,
          });

          alert(
            `Failed to read "${file.name}". ${
              readerError instanceof Error ? readerError.message : 'Unknown error'
            }\n\nPlease try:\n• Using a different image\n• Checking if the file is corrupted\n• Using a different browser`
          );
          continue;
        }
      }

      newImages.push({
        data: base64Data,
        mediaType: sizeValidation.needsCompression ? 'image/jpeg' : (file.type as any),
        preview: preview,
        name: file.name,
        compressionStats: compressionStats,
      });
    }

    setImages([...images, ...newImages]);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (disabled) return;

    const trimmedMessage = message.trim();
    if (!trimmedMessage && images.length === 0) return;

    onSend(trimmedMessage, images);
    setMessage('');
    setImages([]);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{
      borderTop: '1px solid var(--color-border)',
      background: 'var(--color-background)'
    }}>
      {/* Image Previews */}
      {images.length > 0 && (
        <div className="p-3 flex gap-2 overflow-x-auto">
          {images.map((img, idx) => (
            <div key={idx} className="relative flex-shrink-0 flex flex-col">
              <div className="relative">
                <img
                  src={img.preview}
                  alt={img.name}
                  className="h-20 w-20 object-cover"
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-border)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center text-xs"
                  style={{
                    background: 'var(--color-error)',
                    color: 'var(--color-background)',
                    borderRadius: 'var(--radius-full)',
                    transition: 'opacity var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  ×
                </button>
              </div>
              {img.compressionStats && (
                <div
                  className="text-xs mt-1 max-w-[80px]"
                  style={{
                    color: 'var(--color-text-secondary)',
                    lineHeight: '1.2'
                  }}
                  title={img.compressionStats}
                >
                  {img.compressionStats}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 flex gap-2 items-end">
        {/* Attach Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="flex-shrink-0 p-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            color: 'var(--color-text-secondary)',
            borderRadius: 'var(--radius-lg)',
            transition: 'all var(--transition-base)'
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.color = 'var(--color-text)';
              e.currentTarget.style.background = 'var(--color-surface)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-secondary)';
            e.currentTarget.style.background = 'transparent';
          }}
          title="Attach images"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageSelect}
          className="hidden"
        />

        {/* Message Input */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            adjustHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none px-4 py-2 focus:outline-none disabled:cursor-not-allowed"
          style={{
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            background: disabled ? 'var(--color-surface)' : 'var(--color-background)',
            color: 'var(--color-text)',
            boxShadow: 'none',
            transition: 'all var(--transition-base)'
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = `${
              getComputedStyle(document.documentElement).getPropertyValue('--focus-outline-width')
            } solid var(--focus-outline-color)`;
            e.currentTarget.style.borderColor = 'var(--color-primary)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={disabled || (!message.trim() && images.length === 0)}
          className="flex-shrink-0 px-4 py-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'var(--color-primary)',
            color: 'var(--color-background)',
            borderRadius: 'var(--radius-lg)',
            transition: 'all var(--transition-base)'
          }}
          onMouseEnter={(e) => {
            if (!disabled && !(!message.trim() && images.length === 0)) {
              e.currentTarget.style.background = 'var(--color-primary-dark)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-primary)';
          }}
        >
          Send
        </button>
      </div>
    </form>
  );
}
