/**
 * ChatInput Component
 * Message composition with image upload support
 */

import React, { useState, useRef, useCallback } from 'react';

interface ImageAttachment {
  data: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  preview: string;
  name: string;
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

      // Read file as base64
      const reader = new FileReader();
      const imageData = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      // Extract base64 data (remove data:image/...;base64, prefix)
      const base64Data = imageData.split(',')[1];

      newImages.push({
        data: base64Data,
        mediaType: file.type as any,
        preview: imageData,
        name: file.name,
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
            <div key={idx} className="relative flex-shrink-0">
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
