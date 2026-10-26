'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = 'Ask a question about this document...',
}: ChatInputProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [content]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() || disabled) return;
    onSendMessage(content.trim());
    setContent('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex items-end gap-2 p-2 rounded-2xl border border-border/80 bg-card/90 shadow-md backdrop-blur-md focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all"
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={content}
        onChange={e => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 max-h-[180px] resize-none bg-transparent px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 leading-relaxed"
      />

      <div className="flex items-center gap-1.5 pb-1 pr-1">
        <button
          type="submit"
          disabled={!content.trim() || disabled}
          className={cn(
            'inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150',
            content.trim() && !disabled
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 active:scale-95'
              : 'bg-muted text-muted-foreground/50 cursor-not-allowed'
          )}
          aria-label="Send message"
          title="Send question (Enter)"
        >
          <Send className="w-4 h-4 ml-0.5" />
        </button>
      </div>
    </form>
  );
}
