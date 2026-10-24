'use client';

import React from 'react';
import { Menu, FileText, Sparkles, CheckCircle2 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { DocumentItem } from '@/lib/types';

interface ChatHeaderProps {
  activeDocument: DocumentItem | null;
  onToggleSidebar: () => void;
}

export function ChatHeader({ activeDocument, onToggleSidebar }: ChatHeaderProps) {
  return (
    <header className="h-16 border-b border-border/80 bg-background/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Document Info */}
        {activeDocument ? (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 border border-indigo-500/20">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex flex-col">
              <h2 className="text-sm font-semibold text-foreground truncate max-w-[200px] sm:max-w-[320px] md:max-w-[450px]">
                {activeDocument.title}
              </h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{activeDocument.pageCount} pages</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Indexed
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>Document Intelligence Workspace</span>
          </div>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2.5">
        <ThemeToggle />
      </div>
    </header>
  );
}
