'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, CheckSquare, Home, ListTodo } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

export type ProductSection = 'home' | 'tasks' | 'documents';

const sections = [
  { id: 'home', label: 'Home', href: '/', icon: Home },
  { id: 'tasks', label: 'My Tasks', href: '/tasks', icon: CheckSquare },
  {
    id: 'documents',
    label: 'Documents & AI Assistant',
    href: '/documents',
    icon: BookOpen,
  },
] as const;

export function ProductNavLinks({
  active,
  compact = false,
}: {
  active: ProductSection;
  compact?: boolean;
}) {
  return (
    <nav aria-label="Main navigation" className="flex items-center gap-1">
      {sections.map(section => {
        const Icon = section.icon;
        const selected = section.id === active;
        return (
          <Link
            key={section.id}
            href={section.href}
            aria-current={selected ? 'page' : undefined}
            title={section.label}
            className={cn(
              'inline-flex h-9 items-center justify-center gap-2 rounded-lg px-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 sm:px-3',
              selected
                ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className={cn('hidden whitespace-nowrap', compact ? '2xl:inline' : 'lg:inline')}>
              {section.label}
            </span>
            <span className="sr-only">{selected ? ' (current page)' : ''}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function ProductNavigation({ active }: { active: ProductSection }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2 rounded-lg focus-visible:ring-2 focus-visible:ring-indigo-500 sm:gap-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <ListTodo className="h-5 w-5" />
          </span>
          <span className="truncate text-sm font-bold tracking-tight text-foreground sm:text-lg">
            TaskFlow <span className="text-indigo-500">AI</span>
          </span>
        </Link>

        <ProductNavLinks active={active} />

        <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2.5">
          <span className="hidden rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-2 text-xs font-medium text-amber-800 sm:inline dark:text-amber-200">
            Shared demo
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
