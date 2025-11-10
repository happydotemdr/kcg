/**
 * DOS-Themed Input Component
 * Command-line style input for ChatGPT
 */

import React, { useState, useRef } from 'react';
import type { KeyboardEvent } from 'react';

interface DosInputProps {
  onSend: (message: string, images: { data: string; mediaType: string }[]) => void;
  disabled?: boolean;
}

export default function DosInput({ onSend, disabled }: DosInputProps) {
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<{ data: string; mediaType: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSend(message, images);
      setMessage('');
      setImages([]);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: { data: string; mediaType: string }[] = [];

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

  return (
    <div className="dos-input-container border-t-2 border-green-500 p-4">
      {/* Image Preview */}
      {images.length > 0 && (
        <div className="mb-2 flex gap-2 flex-wrap">
          {images.map((img, idx) => (
            <div
              key={idx}
              className="dos-image-preview relative border border-green-500 p-1"
            >
              <img
                src={`data:${img.mediaType};base64,${img.data}`}
                alt="Upload preview"
                className="w-16 h-16 object-cover dos-preview-image"
              />
              <button
                onClick={() => removeImage(idx)}
                className="dos-remove-button absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 flex items-center justify-center text-xs font-bold border border-red-700"
              >
                X
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        {/* DOS Prompt */}
        <div className="dos-prompt text-green-400 font-mono text-lg pb-2">
          C:\&gt;
        </div>

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="ENTER COMMAND..."
            rows={1}
            className="dos-textarea w-full bg-black text-green-400 font-mono text-base border-2 border-green-500 p-2 resize-none focus:outline-none focus:border-green-300 placeholder-green-700 disabled:opacity-50"
            style={{
              minHeight: '40px',
              maxHeight: '120px',
            }}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          {/* Image Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="dos-button dos-button-image bg-blue-900 text-blue-300 font-mono px-3 py-2 border-2 border-blue-500 hover:bg-blue-800 hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Upload Image"
          >
            [IMG]
          </button>

          {/* Send Button */}
          <button
            onClick={handleSubmit}
            disabled={disabled || !message.trim()}
            className="dos-button dos-button-send bg-green-900 text-green-300 font-mono px-4 py-2 border-2 border-green-500 hover:bg-green-800 hover:border-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            [SEND]
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      {/* Instructions */}
      <div className="dos-instructions mt-2 text-green-700 text-xs font-mono">
        Press ENTER to send • SHIFT+ENTER for new line
      </div>
    </div>
  );
}
