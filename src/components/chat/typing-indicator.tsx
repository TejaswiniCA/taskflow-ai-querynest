import React from 'react';
import { Sparkles } from 'lucide-react';

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 py-2 px-1 text-sm text-muted-foreground" aria-live="polite">
      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center ring-1 ring-indigo-500/20">
        <Sparkles className="w-4 h-4 animate-spin text-indigo-500" style={{ animationDuration: '3s' }} />
      </div>
      <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-card border border-border shadow-sm">
        <span className="text-xs font-medium text-muted-foreground mr-1">Searching & synthesising</span>
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
