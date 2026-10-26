'use client';

import React, { useRef, useState } from 'react';
import {
  FileUp,
  ShieldCheck,
  SearchCheck,
  Zap,
  Sparkles,
  UploadCloud,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DocumentItem, UploadProgress } from '@/lib/types';
import { formatFileSize, cn } from '@/lib/utils';

interface LandingHeroProps { onDocumentAdded: (newDoc: DocumentItem) => void }

export function LandingHero({ onDocumentAdded }: LandingHeroProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    status: 'idle',
    progress: 0,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
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

    setUploadProgress({
      status: 'uploading',
      progress: 25,
      fileName: file.name,
    });

    const formData = new FormData();
    formData.append('file', file);

    const progressTimer = setInterval(() => {
      setUploadProgress(prev => {
        if (prev.status === 'uploading' && prev.progress < 50) {
          return { ...prev, progress: prev.progress + 6 };
        }
        if (prev.progress >= 50 && prev.progress < 88) {
          return { ...prev, status: 'embedding', progress: prev.progress + 4 };
        }
        return prev;
      });
    }, 350);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressTimer);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed with status ${res.status}`);
      }

      const data = await res.json();

      setUploadProgress({
        status: 'ready',
        progress: 100,
        fileName: file.name,
      });

      onDocumentAdded(data.document);

      setTimeout(() => {
        setUploadProgress({ status: 'idle', progress: 0 });
      }, 1200);
    } catch (err: unknown) {
      clearInterval(progressTimer);
      setUploadProgress({
        status: 'error',
        progress: 0,
        fileName: file.name,
        errorMessage: err instanceof Error ? err.message : 'Failed to upload and index document.',
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

  const featureCards = [
    {
      icon: SearchCheck,
      title: 'Verifiable Citations',
      description:
        'Every answer includes interactive page citations. Click any citation chip to inspect the exact verbatim excerpt in the source document.',
    },
    {
      icon: ShieldCheck,
      title: 'Context Grounding',
      description:
        'Answers use passages retrieved from your uploaded document. If retrieval finds no passages, QueryNest says it could not find an answer in your documents.',
    },
    {
      icon: Zap,
      title: 'Fast Vector Retrieval',
      description:
        'High-density text chunking with sliding token windows and Gemini vector embeddings for instant semantic search across hundreds of pages.',
    },
  ];

  return (
    <div className="relative overflow-hidden w-full flex flex-col items-center justify-center py-10 md:py-16 px-4 md:px-8">
      {/* Hidden file input */}
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

      {/* Soft gradient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-b from-indigo-500/15 via-indigo-600/5 to-transparent blur-3xl rounded-full"
      />

      <div className="relative max-w-3xl mx-auto text-center space-y-6">
        {/* Subtle pill badge */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Document intelligence for your local workspace</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]"
        >
          Turn complex documents into <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-600 bg-clip-text text-transparent">
            instant, proven insights
          </span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="text-lg sm:text-xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed"
        >
          Ask your documents. Get answers with proof.
        </motion.p>

        {/* Hero Interactive Upload Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="max-w-xl mx-auto pt-2 w-full"
        >
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
              'relative flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-dashed transition-all duration-200 cursor-pointer select-none text-center shadow-lg',
              isDragging
                ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
                : 'border-indigo-500/30 hover:border-indigo-500/60 bg-card/70 hover:bg-card/90 backdrop-blur-md',
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
                  className="space-y-4 flex flex-col items-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 ring-4 ring-indigo-500/20">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md transition-all active:scale-95"
                    >
                      <FileUp className="w-4 h-4" />
                      <span>Upload a document</span>
                    </button>
                    <p className="text-xs text-muted-foreground mt-2">
                      or drag & drop your PDF or TXT file here (Up to 5 MB)
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
                  className="w-full max-w-sm space-y-3 py-2"
                >
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="flex items-center gap-2 text-foreground truncate max-w-[200px]">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      {uploadProgress.status === 'uploading' && 'Uploading document...'}
                      {uploadProgress.status === 'embedding' && 'Generating Gemini embeddings...'}
                    </span>
                    <span className="text-indigo-500 font-bold">{uploadProgress.progress}%</span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full bg-indigo-600 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress.progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground truncate">
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
                  className="flex items-center gap-2 text-emerald-500 text-sm font-semibold py-3"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Document indexed! Opening chat...</span>
                </motion.div>
              )}

              {uploadProgress.status === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2 py-2"
                >
                  <div className="flex items-center justify-center gap-2 text-destructive text-sm font-medium">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>Upload Failed</span>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    {uploadProgress.errorMessage}
                  </p>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setUploadProgress({ status: 'idle', progress: 0 });
                    }}
                    className="text-xs text-indigo-500 hover:underline pt-1 font-semibold"
                  >
                    Try again
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* 3 Feature Cards */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-14 sm:mt-18 w-full"
      >
        {featureCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="flex flex-col items-start p-6 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm hover:border-indigo-500/40 hover:shadow-md transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center mb-4 ring-1 ring-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{card.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
