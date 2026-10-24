'use client';

import React, { useRef, useEffect, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { ChatMessageItem } from './chat-message';
import { EmptyChatState } from './empty-chat-state';
import { TypingIndicator } from './typing-indicator';
import { ChatInput } from './chat-input';
import { ChatMessage, Citation, DocumentItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  document: DocumentItem | null;
  messages: ChatMessage[];
  isGenerating: boolean;
  onSendMessage: (content: string) => void;
  onCitationClick: (citation: Citation) => void;
  onOpenUpload?: () => void;
}

export function ChatPanel({
  document,
  messages,
  isGenerating,
  onSendMessage,
  onCitationClick,
}: ChatPanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  // Check scroll position to respect user's reading intent
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    // If user is more than 80px away from bottom, they scrolled up intentionally
    setUserScrolledUp(distanceFromBottom > 80);
  };

  // Auto-scroll when new messages arrive only if user hasn't scrolled up
  useEffect(() => {
    if (!userScrolledUp && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isGenerating, userScrolledUp]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUserScrolledUp(false);
  };

  return (
    <div className="relative flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Scrollable Message Timeline */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-6"
      >
        <div className="max-w-chat mx-auto w-full space-y-4">
          {messages.length === 0 && document ? (
            <EmptyChatState
              documentTitle={document.title}
              pageCount={document.pageCount}
              suggestedQuestions={document.suggestedQuestions}
              onSelectQuestion={onSendMessage}
            />
          ) : (
            messages.map(msg => (
              <ChatMessageItem
                key={msg.id}
                message={msg}
                onCitationClick={onCitationClick}
              />
            ))
          )}

          {isGenerating && <TypingIndicator />}

          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Floating Scroll to Bottom pill if user scrolled up */}
      {userScrolledUp && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-24 right-6 sm:right-10 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-semibold shadow-lg hover:bg-indigo-500 transition-all duration-150 animate-fade-in"
          aria-label="Scroll to newest messages"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>New messages below</span>
        </button>
      )}

      {/* Sticky Bottom Input Zone */}
      <div className="border-t border-border/60 bg-background/80 backdrop-blur-md p-4 sm:px-6">
        <div className="max-w-chat mx-auto w-full">
          <ChatInput
            onSendMessage={onSendMessage}
            disabled={isGenerating || !document}
            placeholder={
              document
                ? `Ask anything about ${document.title}...`
                : 'Select or upload a document to begin chatting'
            }
          />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-2 pt-2 select-none">
            <span>Powered by Gemini • Strict Context Grounding</span>
            <span className="hidden sm:inline">Press Enter to send, Shift + Enter for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
}
