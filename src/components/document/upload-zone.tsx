'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatFileSize, cn } from '@/lib/utils';
import { DocumentItem, UploadProgress } from '@/lib/types';

interface UploadZoneProps {
  onDocumentAdded: (newDoc: DocumentItem, chunks?: any[]) => void;
  className?: string;
}

export function UploadZone({ onDocumentAdded, className }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    status: 'idle',
    progress: 0,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    // Client-side quick check
    if (file.size > 5 * 1024 * 1024) {
      setUploadProgress({
        status: 'error',
        progress: 0,
        fileName: file.name,
        errorMessage: `File exceeds 5 MB limit (${formatFileSize(file.size)}).`,
      });
      return;
    }

    const validExtensions = ['.pdf', '.txt'];
    const hasValidExt = validExtensions.some(ext =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExt) {
      setUploadProgress({
        status: 'error',
        progress: 0,
        fileName: file.name,
        errorMessage: 'Only PDF and TXT documents are supported.',
      });
      return;
    }

    // Step 1: Uploading
    setUploadProgress({
      status: 'uploading',
      progress: 25,
      fileName: file.name,
    });

    const formData = new FormData();
    formData.append('file', file);

    // Progress simulation while server performs extraction & embedding
    const progressTimer = setInterval(() => {
      setUploadProgress(prev => {
        if (prev.status === 'uploading' && prev.progress < 50) {
          return { ...prev, progress: prev.progress + 5 };
        }
        if (prev.progress >= 50 && prev.progress < 85) {
          return { ...prev, status: 'embedding', progress: prev.progress + 5 };
        }
        return prev;
      });
    }, 400);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressTimer);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed with HTTP ${res.status}`);
      }

      const data = await res.json();

      setUploadProgress({
        status: 'ready',
        progress: 100,
        fileName: file.name,
      });

      onDocumentAdded(data.document, data.chunks);

      setTimeout(() => {
        setUploadProgress({ status: 'idle', progress: 0 });
      }, 2000);
    } catch (err: any) {
      clearInterval(progressTimer);
      setUploadProgress({
        status: 'error',
        progress: 0,
        fileName: file.name,
        errorMessage: err?.message || 'Failed to upload and index document.',
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt"
        className="hidden"
        onChange={e => {
          if (e.target.files && e.target.files.length > 0) {
            handleUpload(e.target.files[0]);
          }
        }}
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (uploadProgress.status === 'idle' || uploadProgress.status === 'error') {
            fileInputRef.current?.click();
          }
        }}
        className={cn(
          'relative flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer select-none text-center',
          isDragging
            ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
            : 'border-border/80 hover:border-indigo-500/40 bg-card/40 hover:bg-card/70',
          uploadProgress.status !== 'idle' &&
            uploadProgress.status !== 'error' &&
            'pointer-events-none'
        )}
      >
        <AnimatePresence mode="wait">
          {uploadProgress.status === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Drop PDF or TXT here
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  or click to browse • Up to 5 MB
                </p>
              </div>
            </motion.div>
          )}

          {(uploadProgress.status === 'uploading' ||
            uploadProgress.status === 'parsing' ||
            uploadProgress.status === 'embedding') && (
            <motion.div
              key="busy"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full space-y-2.5 py-1"
            >
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-foreground truncate max-w-[140px]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                  {uploadProgress.status === 'uploading' && 'Uploading...'}
                  {uploadProgress.status === 'parsing' && 'Extracting text...'}
                  {uploadProgress.status === 'embedding' && 'Embedding vectors...'}
                </span>
                <span className="text-indigo-500 font-semibold">{uploadProgress.progress}%</span>
              </div>

              {/* Animated Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full bg-indigo-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              <p className="text-[11px] text-muted-foreground truncate">
                {uploadProgress.fileName}
              </p>
            </motion.div>
          )}

          {uploadProgress.status === 'ready' && (
            <motion.div
              key="ready"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-emerald-500 text-xs font-semibold py-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Indexed & Ready!</span>
            </motion.div>
          )}

          {uploadProgress.status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-1 py-1"
            >
              <div className="flex items-center justify-center gap-1.5 text-destructive text-xs font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Upload Failed</span>
              </div>
              <p className="text-[11px] text-muted-foreground break-words max-w-[220px]">
                {uploadProgress.errorMessage}
              </p>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setUploadProgress({ status: 'idle', progress: 0 });
                }}
                className="text-[11px] text-indigo-500 hover:underline pt-1 font-semibold"
              >
                Try again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
