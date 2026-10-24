'use client';

import React from 'react';
import { FileText, ChevronRight } from 'lucide-react';
import { DocumentItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface DocumentListProps {
  documents: DocumentItem[];
  activeDocId: string | null;
  onSelectDocument: (doc: DocumentItem) => void;
}

export function DocumentList({
  documents,
  activeDocId,
  onSelectDocument,
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-muted-foreground">
        No documents uploaded yet.
      </div>
    );
  }

  return (
    <div className="space-y-1.5" role="list" aria-label="Indexed Documents">
      {documents.map(doc => {
        const isActive = doc.id === activeDocId;
        return (
          <button
            key={doc.id}
            type="button"
            onClick={() => onSelectDocument(doc)}
            className={cn(
              'group w-full flex items-center justify-between p-3 rounded-xl text-left transition-all duration-150',
              isActive
                ? 'bg-indigo-500/10 border border-indigo-500/30 text-foreground shadow-xs'
                : 'hover:bg-accent/40 text-muted-foreground hover:text-foreground border border-transparent'
            )}
            aria-current={isActive ? 'true' : undefined}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'bg-muted text-muted-foreground group-hover:bg-accent/60 group-hover:text-foreground'
                )}
              >
                <FileText className="w-4 h-4" />
              </div>

              <div className="min-w-0 flex flex-col">
                <span className="text-sm font-medium truncate leading-tight group-hover:text-foreground">
                  {doc.title}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  {doc.pageCount} pages • {doc.uploadedAt}
                </span>
              </div>
            </div>

            <ChevronRight
              className={cn(
                'w-4 h-4 flex-shrink-0 transition-transform duration-150',
                isActive
                  ? 'text-indigo-500 translate-x-0.5'
                  : 'text-muted-foreground/40 group-hover:text-muted-foreground'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
