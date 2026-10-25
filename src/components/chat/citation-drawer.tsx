'use client';

import React, { useEffect } from 'react';
import { X, BookOpen, Copy, Check, ExternalLink, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Citation } from '@/lib/types';

interface CitationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  citation: Citation | null;
  documentTitle: string;
}

export function CitationDrawer({
  isOpen,
  onClose,
  citation,
  documentTitle,
}: CitationDrawerProps) {
  const [copied, setCopied] = React.useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopySnippet = () => {
    if (!citation) return;
    navigator.clipboard.writeText(citation.snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && citation && (
        <>
          {/* Backdrop on mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 lg:hidden"
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            aria-label="Source Document Citation"
            className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-card border-l border-border shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-card/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center ring-1 ring-indigo-500/20">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Source Passage</h3>
                  <p className="text-xs text-muted-foreground">Verifiable document ground truth</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/40 flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label="Close citation drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Document metadata pill */}
              <div className="rounded-xl border border-border/80 bg-accent/20 p-4 space-y-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Origin File
                </span>
                <p className="text-sm font-semibold text-foreground break-words">{documentTitle}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
                    Page {citation.pageNumber}
                  </span>
                  {citation.score && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <Sparkles className="w-3 h-3" />
                      {(citation.score * 100).toFixed(0)}% Match Confidence
                    </span>
                  )}
                </div>
              </div>

              {/* Section Header */}
              {citation.sectionTitle && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Section
                  </h4>
                  <p className="text-sm font-medium text-foreground">{citation.sectionTitle}</p>
                </div>
              )}

              {/* Exact Snippet Quote */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Extracted Passage
                  </h4>
                  <button
                    type="button"
                    onClick={handleCopySnippet}
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-500 dark:text-indigo-400 hover:underline font-medium"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy passage</span>
                      </>
                    )}
                  </button>
                </div>

                <blockquote className="relative p-4 rounded-xl bg-card border border-indigo-500/20 shadow-sm text-foreground/90 text-sm leading-relaxed font-serif italic border-l-4 border-l-indigo-500">
                  &ldquo;{citation.snippet}&rdquo;
                </blockquote>
              </div>

              {/* Explanation Note */}
              <div className="rounded-xl border border-border bg-card/40 p-4 text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground font-semibold">Strict Grounding Rule:</strong>{' '}
                QueryNest retrieves this chunk using cosine similarity over Gemini vector embeddings,
                ensuring every fact presented in the chat answers from this source excerpt.
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="px-6 py-4 border-t border-border bg-card/60 flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
