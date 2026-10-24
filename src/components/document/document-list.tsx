'use client';

import React from 'react';
import { FileText, ChevronRight, Trash2 } from 'lucide-react';
import { DocumentItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface DocumentListProps {
  documents: DocumentItem[];
  activeDocId: string | null;
  onSelectDocument: (doc: DocumentItem) => void;
  onDeleteDocument?: (docId: string) => void;
}

export function DocumentList({
  documents,
  activeDocId,
  onSelectDocument,
  onDeleteDocument,
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="py-8 text-center px-2 space-y-2">
        <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center mx-auto">
          <FileText className="w-4 h-4 opacity-50" />
        </div>
        <p className="text-xs text-muted-foreground">
          No documents uploaded yet.
        </p>
        <p className="text-[11px] text-muted-foreground/70">
          Upload a PDF or TXT to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5" role="list" aria-label="Indexed Documents">
      {documents.map(doc => {
        const isActive = doc.id === activeDocId;
        return (
          <div
            key={doc.id}
            className={cn(
              'group relative flex items-center justify-between p-2.5 rounded-xl transition-all duration-150',
              isActive
                ? 'bg-indigo-500/10 border border-indigo-500/30 text-foreground shadow-xs'
                : 'hover:bg-accent/40 text-muted-foreground hover:text-foreground border border-transparent'
            )}
          >
            <button
              type="button"
              onClick={() => onSelectDocument(doc)}
              className="flex-1 flex items-center gap-3 min-w-0 text-left"
              aria-current={isActive ? 'true' : undefined}
            >
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

              <div className="min-w-0 flex flex-col pr-1">
                <span className="text-sm font-medium truncate leading-tight group-hover:text-foreground">
                  {doc.title}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  {doc.pageCount} pages • {doc.uploadedAt}
                </span>
              </div>
            </button>

            <div className="flex items-center gap-1">
              {onDeleteDocument && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    if (confirm(`Remove "${doc.title}"?`)) {
                      onDeleteDocument(doc.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all focus:opacity-100"
                  aria-label={`Delete ${doc.title}`}
                  title="Remove document"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <ChevronRight
                className={cn(
                  'w-4 h-4 flex-shrink-0 transition-transform duration-150',
                  isActive
                    ? 'text-indigo-500 translate-x-0.5'
                    : 'text-muted-foreground/40 group-hover:text-muted-foreground'
                )}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
