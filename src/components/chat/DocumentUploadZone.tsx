/**
 * DocumentUploadZone Component
 * Drag-and-drop file upload interface for calendar documents
 */

import React, { useState, useCallback } from 'react';

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

    // Filter to supported file types
    const supportedFiles = files.filter((file) => {
      return (
        file.type.startsWith('image/') ||
        file.type === 'application/pdf' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'text/plain'
      );
    });

    if (supportedFiles.length === 0) {
      alert('Please upload supported file types: images, PDFs, Word docs, or text files');
      return;
    }

    // Limit number of files
    const filesToUpload = supportedFiles.slice(0, maxFiles);

    if (supportedFiles.length > maxFiles) {
      alert(`Only the first ${maxFiles} files will be uploaded`);
    }

    onUpload(filesToUpload);
  }, [disabled, maxFiles, onUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || !e.target.files) return;

    const files = Array.from(e.target.files);

    if (files.length > 0) {
      const filesToUpload = files.slice(0, maxFiles);
      onUpload(filesToUpload);
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
          Supported: PDF, PNG, JPG, HEIC, DOCX, TXT (max {maxFiles} files, 10MB each)
        </div>
      </div>
    </div>
  );
}
