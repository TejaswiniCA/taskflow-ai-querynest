import React from 'react';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WordmarkProps {
  className?: string;
  iconSize?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export function Wordmark({ className, iconSize = 'md', showTagline = false }: WordmarkProps) {
  const iconDimensions = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const containerDimensions = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  };

  return (
    <div className={cn('flex items-center gap-3 select-none', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-500/30 transition-transform duration-200 group-hover:scale-105',
          containerDimensions[iconSize]
        )}
      >
        <BookOpen className={cn('stroke-[2.2]', iconDimensions[iconSize])} />
      </div>
      <div className="flex flex-col">
        <div className="flex items-center font-bold tracking-tight text-foreground text-lg leading-tight">
          <span>Query</span>
          <span className="text-indigo-500 dark:text-indigo-400">Nest</span>
        </div>
        {showTagline && (
          <span className="text-xs text-muted-foreground font-normal">
            Grounded document intelligence
          </span>
        )}
      </div>
    </div>
  );
}
