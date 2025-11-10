/**
 * Modern Chat Input Component
 * Clean textarea with image upload and send button
 */

import React, { useState, useRef, useCallback } from 'react';

interface ImageAttachment {
  data: string;
  mediaType: string;
}

interface DosInputProps {
  onSend: (message: string, images: ImageAttachment[]) => void;
  disabled?: boolean;
}

export default function DosInput({ onSend, disabled }: DosInputProps) {
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: ImageAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const reader = new FileReader();
      await new Promise<void>((resolve) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          newImages.push({
            data: base64,
            mediaType: file.type,
          });
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }

    setImages((prev) => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if ((message.trim() || images.length > 0) && !disabled) {
      onSend(message, images);
      setMessage('');
      setImages([]);

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* Image Previews */}
      {images.length > 0 && (
        <div className="px-4 pt-3 flex gap-2 overflow-x-auto">
          {images.map((img, idx) => (
            <div
              key={idx}
              className="relative flex-shrink-0 rounded-lg overflow-hidden border border-gray-200"
            >
              <img
                src={`data:${img.mediaType};base64,${img.data}`}
                alt="Upload preview"
                className="h-20 w-20 object-cover"
              />
              <button
                onClick={() => removeImage(idx)}
                type="button"
                className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center text-xs bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                title="Remove image"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 flex gap-3 items-end">
        {/* Image Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          type="button"
          className="flex-shrink-0 p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            adjustHeight();
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Type your message..."
          rows={1}
          className="flex-1 resize-none px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        />

        {/* Send Button */}
        <button
          onClick={handleSubmit}
          disabled={disabled || (!message.trim() && images.length === 0)}
          type="button"
          className="flex-shrink-0 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Send message"
        >
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16346273 C3.34915502,0.9 2.40734225,1.00636533 1.77946707,1.4776575 C0.994623095,2.10604706 0.837654326,3.0486314 1.15159189,3.99701575 L3.03521743,10.4380088 C3.03521743,10.5951061 3.34915502,10.7522035 3.50612381,10.7522035 L16.6915026,11.5376904 C16.6915026,11.5376904 17.1624089,11.5376904 17.1624089,12.0089825 C17.1624089,12.4744748 16.6915026,12.4744748 16.6915026,12.4744748 Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
