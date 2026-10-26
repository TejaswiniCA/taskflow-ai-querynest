'use client';

import React from 'react';
import { Plus, X, Layers } from 'lucide-react';
import { Wordmark } from '@/components/brand/wordmark';
import { DocumentList } from '@/components/document/document-list';
import { UploadZone } from '@/components/document/upload-zone';
import { DocumentItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SidebarProps {
  documents: DocumentItem[];
  activeDocId: string | null;
  onSelectDocument: (doc: DocumentItem) => void;
  onDocumentAdded: (newDoc: DocumentItem) => void;
  onDeleteDocument?: (docId: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({
  documents,
  activeDocId,
  onSelectDocument,
  onDocumentAdded,
  onDeleteDocument,
  onNewChat,
  isOpen,
  onClose,
}: SidebarProps) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-background/70 backdrop-blur-sm z-30 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 h-screen w-72 sm:w-80 flex flex-col bg-sidebar border-r border-sidebar-border z-40 transition-transform duration-200 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header & Logo */}
        <div className="h-16 px-5 border-b border-sidebar-border flex items-center justify-between">
          <Wordmark iconSize="md" />

          {/* Close on mobile */}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/40"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Button: New Chat */}
        <div className="p-4 border-b border-sidebar-border/60">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-sm transition-all duration-150 active:scale-98 focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Document List Section */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              Your Knowledge Base
            </span>
            <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-2 py-0.5 rounded-full">
              {documents.length}
            </span>
          </div>

          <DocumentList
            documents={documents}
            activeDocId={activeDocId}
            onSelectDocument={doc => {
              onSelectDocument(doc);
              onClose();
            }}
            onDeleteDocument={onDeleteDocument}
          />
        </div>

        {/* Upload Zone & Footer */}
        <div className="p-4 border-t border-sidebar-border space-y-3 bg-sidebar/50">
          <UploadZone onDocumentAdded={onDocumentAdded} />

          <div className="pt-2 text-center">
            <p className="text-[11px] text-muted-foreground/80 leading-tight">
              QueryNest • Verifiable document answers
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
