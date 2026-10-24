import React from 'react';
import { FileUp, ShieldCheck, SearchCheck, Zap, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface LandingHeroProps {
  onUploadClick: () => void;
  onExploreDemo: () => void;
}

export function LandingHero({ onUploadClick, onExploreDemo }: LandingHeroProps) {
  const featureCards = [
    {
      icon: SearchCheck,
      title: 'Verifiable Citations',
      description:
        'Every single answer includes interactive page citations. Click any citation chip to inspect the exact verbatim excerpt in the source document.',
    },
    {
      icon: ShieldCheck,
      title: 'Zero Hallucinations',
      description:
        'Grounded strictly in your uploaded materials. When a question cannot be answered from the document, AskGuru directly informs you rather than guessing.',
    },
    {
      icon: Zap,
      title: 'Fast Vector Retrieval',
      description:
        'High-density text chunking with sliding token windows and Gemini vector embeddings for instant semantic search across hundreds of pages.',
    },
  ];

  return (
    <div className="relative overflow-hidden w-full flex flex-col items-center justify-center py-12 md:py-20 px-4 md:px-8">
      {/* Soft gradient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-b from-indigo-500/15 via-indigo-600/5 to-transparent blur-3xl rounded-full"
      />

      <div className="relative max-w-4xl mx-auto text-center space-y-6">
        {/* Subtle pill badge */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Production-Grade Document Intelligence</span>
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

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
        >
          <button
            type="button"
            onClick={onUploadClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/25 transition-all duration-200 hover:shadow-indigo-600/35 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <FileUp className="w-5 h-5" />
            <span>Upload a document</span>
          </button>

          <button
            type="button"
            onClick={onExploreDemo}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-border bg-card/80 hover:bg-accent/30 text-foreground font-medium transition-all duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <span>Explore demo document</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </motion.div>
      </div>

      {/* 3 Feature Cards */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-14 sm:mt-20 w-full"
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
