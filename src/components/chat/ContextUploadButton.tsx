/**
 * ContextUploadButton Component
 * Agent-specific document upload button with icon and label
 */

import React, { useRef } from 'react';

interface ContextUploadButtonProps {
  label: string;
  icon?: string;
  acceptedTypes: string[];
  onUpload: (files: File[]) => void;
  disabled?: boolean;
}

export default function ContextUploadButton({
  label,
  icon = '📄',
  acceptedTypes,
  onUpload,
  disabled = false,
}: ContextUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    onUpload(fileArray);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="w-full px-3 py-2 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: 'var(--color-background)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          transition: 'all var(--transition-base)',
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = 'var(--color-primary)';
            e.currentTarget.style.color = 'var(--color-primary)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border)';
          e.currentTarget.style.color = 'var(--color-text)';
        }}
      >
        <span>{icon}</span>
        <span>{label}</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );
}
