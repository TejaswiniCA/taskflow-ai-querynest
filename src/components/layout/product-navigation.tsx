'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, CheckSquare, Home, ListTodo, LogOut } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
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

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setError(null);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error('Sign out failed. Please try again.');
      router.replace('/sign-in');
      router.refresh();
    } catch {
      setError('Sign out failed. Please try again.');
      setIsSigningOut(false);
    }
  };

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={signOut}
        disabled={isSigningOut}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/40 disabled:opacity-60 sm:px-3"
        title="Sign out"
      >
        <LogOut className="h-4 w-4" />
        <span className={cn('hidden', compact ? '2xl:inline' : 'sm:inline')}>
          {isSigningOut ? 'Signing out…' : 'Sign out'}
        </span>
      </button>
      {error && <span role="alert" className="absolute mt-10 rounded bg-background px-2 py-1 text-xs text-destructive shadow">{error}</span>}
    </div>
  );
}

export function ProductNavigation({
  active,
  userEmail,
  authMode = 'better-auth',
}: {
  active: ProductSection;
  userEmail: string;
  authMode?: 'local-development' | 'better-auth';
}) {
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
          <span className="hidden max-w-40 truncate text-xs text-muted-foreground xl:block" title={userEmail}>
            {userEmail}
          </span>
          {authMode === 'local-development' ? (
            <span className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-2 text-xs font-medium text-amber-800 dark:text-amber-200">
              Local only
            </span>
          ) : (
            <SignOutButton />
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
