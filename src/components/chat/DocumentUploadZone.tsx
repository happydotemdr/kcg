/**
 * DocumentUploadZone Component
 * Drag-and-drop file upload interface for calendar documents
 */

import React, { useState, useCallback } from 'react';
import { validateFileSize } from '../../utils/fileValidation';
import { formatFileSize } from '../../utils/errorMessages';

interface DocumentUploadZoneProps {
  onUpload: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

type UploadState = 'idle' | 'hovering' | 'uploading';

export default function DocumentUploadZone({
  onUpload,
  disabled = false,
  maxFiles = 5,
}: DocumentUploadZoneProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');

  const stateConfig = {
    idle: {
      icon: '📎',
      text: 'Drop school forms, schedules, or photos here',
      subtext: 'or click to browse',
      bgColor: 'var(--color-surface)',
      borderColor: 'var(--color-border)',
      borderStyle: 'dashed',
    },
    hovering: {
      icon: '📥',
      text: 'Release to upload',
      subtext: '',
      bgColor: 'var(--color-primary-light, rgba(99, 102, 241, 0.1))',
      borderColor: 'var(--color-primary)',
      borderStyle: 'solid',
    },
    uploading: {
      icon: '⏳',
      text: 'Uploading...',
      subtext: '',
      bgColor: 'var(--color-surface)',
      borderColor: 'var(--color-primary)',
      borderStyle: 'solid',
    },
  };

  const config = stateConfig[uploadState];

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setUploadState('hovering');
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    // Use relatedTarget to check if we're actually leaving the component
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setUploadState('idle');
    }
  }, [disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    setUploadState('idle');

    const files = Array.from(e.dataTransfer.files);

    if (files.length === 0) return;

    // Filter to supported file types and collect unsupported ones
    const supportedFiles: File[] = [];
    const unsupportedFiles: { name: string; type: string }[] = [];

    files.forEach((file) => {
      const isSupported =
        file.type.startsWith('image/') ||
        file.type === 'application/pdf' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'text/plain';

      if (isSupported) {
        supportedFiles.push(file);
      } else {
        unsupportedFiles.push({ name: file.name, type: file.type });
      }
    });

    // Show error for unsupported files
    if (unsupportedFiles.length > 0) {
      const errorMessages = unsupportedFiles.map(({ name, type }) =>
        `• ${name} (${type || 'unknown type'})`
      );
      const errorMessage = `The following files have unsupported formats:\n\n${errorMessages.join('\n')}\n\nSupported formats: Images (PNG, JPG, GIF, WebP), PDF, Word documents (DOCX), and text files (TXT).`;

      // Log technical details for debugging
      console.error('[DocumentUpload] Unsupported file types:', unsupportedFiles);

      alert(errorMessage);
    }

    if (supportedFiles.length === 0) {
      return;
    }

    // Limit number of files
    const filesToUpload = supportedFiles.slice(0, maxFiles);

    if (supportedFiles.length > maxFiles) {
      alert(`Only the first ${maxFiles} files will be uploaded`);
    }

    // Validate file sizes
    const validFiles: File[] = [];
    const oversizedFiles: Array<{ name: string; size: number }> = [];

    for (const file of filesToUpload) {
      const validation = validateFileSize(file);

      if (!validation.valid && !validation.needsCompression) {
        // File is too large even for compression
        oversizedFiles.push({ name: file.name, size: file.size });
      } else {
        validFiles.push(file);
      }
    }

    // Show detailed error for oversized files
    if (oversizedFiles.length > 0) {
      const fileDetails = oversizedFiles.map(({ name, size }) =>
        `• ${name} (${formatFileSize(size)})`
      );
      const errorMessage = `The following files are too large:\n\n${fileDetails.join('\n')}\n\nMaximum file size is 5 MB. Please resize or compress these files before uploading. You can:\n• Use an image compression tool\n• Reduce image dimensions\n• Save in a more efficient format (e.g., JPEG)`;

      // Log technical details for debugging
      console.error('[DocumentUpload] Oversized files:', oversizedFiles.map(f => ({ name: f.name, size: f.size, sizeMB: (f.size / (1024 * 1024)).toFixed(2) })));

      alert(errorMessage);
    }

    if (validFiles.length === 0) {
      return;
    }

    onUpload(validFiles);
  }, [disabled, maxFiles, onUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || !e.target.files) return;

    const files = Array.from(e.target.files);

    if (files.length > 0) {
      const filesToUpload = files.slice(0, maxFiles);

      // Validate file sizes
      const validFiles: File[] = [];
      const oversizedFiles: Array<{ name: string; size: number }> = [];

      for (const file of filesToUpload) {
        const validation = validateFileSize(file);

        if (!validation.valid && !validation.needsCompression) {
          // File is too large even for compression
          oversizedFiles.push({ name: file.name, size: file.size });
        } else {
          validFiles.push(file);
        }
      }

      // Show detailed error for oversized files
      if (oversizedFiles.length > 0) {
        const fileDetails = oversizedFiles.map(({ name, size }) =>
          `• ${name} (${formatFileSize(size)})`
        );
        const errorMessage = `The following files are too large:\n\n${fileDetails.join('\n')}\n\nMaximum file size is 5 MB. Please resize or compress these files before uploading. You can:\n• Use an image compression tool\n• Reduce image dimensions\n• Save in a more efficient format (e.g., JPEG)`;

        // Log technical details for debugging
        console.error('[DocumentUpload] Oversized files:', oversizedFiles.map(f => ({ name: f.name, size: f.size, sizeMB: (f.size / (1024 * 1024)).toFixed(2) })));

        alert(errorMessage);
      }

      if (validFiles.length > 0) {
        onUpload(validFiles);
      }
    }

    // Reset input
    e.target.value = '';
  }, [disabled, maxFiles, onUpload]);

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative"
      style={{
        padding: '2rem',
        borderRadius: 'var(--radius-lg)',
        border: `2px ${config.borderStyle} ${config.borderColor}`,
        background: config.bgColor,
        transition: 'all var(--transition-base)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
      onClick={() => {
        if (!disabled) {
          document.getElementById('document-upload-input')?.click();
        }
      }}
    >
      <input
        id="document-upload-input"
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.heic,.docx,.txt,image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      <div className="flex flex-col items-center justify-center gap-3 text-center">
        {/* Icon */}
        <div className="text-5xl" style={{ opacity: 0.9 }}>
          {config.icon}
        </div>

        {/* Main text */}
        <div>
          <p className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>
            {config.text}
          </p>
          {config.subtext && (
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {config.subtext}
            </p>
          )}
        </div>

        {/* Supported formats */}
        <div className="text-xs mt-2" style={{ color: 'var(--color-text-light)' }}>
          Supported: PDF, PNG, JPG, HEIC, DOCX, TXT (max {maxFiles} files, 5MB each)
        </div>
      </div>
    </div>
  );
}
