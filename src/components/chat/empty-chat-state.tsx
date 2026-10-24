import React from 'react';
import { BookOpen, Sparkles, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmptyChatStateProps {
  documentTitle: string;
  pageCount: number;
  suggestedQuestions: string[];
  onSelectQuestion: (question: string) => void;
}

export function EmptyChatState({
  documentTitle,
  pageCount,
  suggestedQuestions,
  onSelectQuestion,
}: EmptyChatStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 max-w-xl mx-auto text-center space-y-6">
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shadow-inner"
      >
        <BookOpen className="w-7 h-7" />
      </motion.div>

      {/* Info */}
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-foreground">
          Ready to interrogate <span className="text-indigo-500">&ldquo;{documentTitle}&rdquo;</span>
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          This document ({pageCount} pages) is indexed and ready. Ask any question to retrieve answers grounded directly with source page references.
        </p>
      </div>

      {/* Suggested Questions */}
      {suggestedQuestions.length > 0 && (
        <div className="w-full space-y-3 pt-4 text-left">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Suggested Inquiries</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {suggestedQuestions.map((question, idx) => (
              <motion.button
                key={idx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
                type="button"
                onClick={() => onSelectQuestion(question)}
                className="group flex items-start gap-3 p-3.5 rounded-xl border border-border/80 bg-card/60 hover:bg-accent/40 hover:border-indigo-500/30 text-left text-sm text-foreground transition-all duration-150 focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <HelpCircle className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <span className="leading-relaxed group-hover:text-indigo-500 transition-colors font-medium">
                  {question}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
