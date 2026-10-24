'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Sparkles, User, BookOpen, Quote } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage as ChatMessageType, Citation } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: ChatMessageType;
  onCitationClick: (citation: Citation) => void;
}

export function ChatMessageItem({ message, onCitationClick }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn(
        'group flex w-full gap-3 md:gap-4 py-3',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {/* Left Avatar for AI */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center mt-1 shadow-sm">
          <Sparkles className="w-4 h-4 text-indigo-500" />
        </div>
      )}

      {/* Message Bubble Container */}
      <div
        className={cn(
          'flex flex-col space-y-2 max-w-[88%] sm:max-w-[78%] md:max-w-chat',
          isUser && 'items-end'
        )}
      >
        {/* Author metadata & Timestamp */}
        <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground select-none">
          <span className="font-semibold">{isUser ? 'You' : 'AskGuru'}</span>
          <span>•</span>
          <span>{message.createdAt}</span>
        </div>

        {/* Bubble Box */}
        <div
          className={cn(
            'relative rounded-2xl px-5 py-4 text-base leading-relaxed break-words shadow-sm transition-all',
            isUser
              ? 'bg-indigo-600 text-white rounded-tr-sm selection:bg-indigo-400 selection:text-white'
              : 'bg-card border border-border/80 text-foreground rounded-tl-sm shadow-sm'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-foreground prose-a:text-indigo-500 prose-code:rounded prose-code:bg-muted/80 prose-code:px-1.5 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-xl prose-pre:bg-muted/60 prose-pre:p-4 prose-pre:border prose-pre:border-border">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Action Row for AI responses (Copy button) */}
          {!isUser && (
            <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
              <span className="italic text-[11px] text-muted-foreground/80">
                Ground-truth sourced answer
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-accent/40 text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-1 focus-visible:ring-indigo-500"
                aria-label="Copy message to clipboard"
                title="Copy message to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500 font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Citation Chips under AI answers */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 px-1">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 select-none">
              <BookOpen className="w-3 h-3 text-indigo-500" />
              Sources:
            </span>
            {message.citations.map(citation => (
              <button
                key={citation.id}
                type="button"
                onClick={() => onCitationClick(citation)}
                className="group/chip inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 hover:bg-indigo-500/20 hover:border-indigo-500/40 transition-all duration-150 shadow-xs focus-visible:ring-2 focus-visible:ring-indigo-400"
                title={`Inspect source passage from Page ${citation.pageNumber}`}
              >
                <Quote className="w-3 h-3 text-indigo-500/70 group-hover/chip:text-indigo-500" />
                <span>Page {citation.pageNumber}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Avatar for User */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center mt-1 shadow-sm">
          <User className="w-4 h-4" />
        </div>
      )}
    </motion.div>
  );
}
