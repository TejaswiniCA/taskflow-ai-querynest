'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, ListTodo, Users } from 'lucide-react';
import { ProductNavLinks } from '@/components/layout/product-navigation';

/** Keeps the established sign-in design as a simple entry screen for the shared demo. */
export function SignInPanel() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const continueToDashboard = () => {
    if (isLoading) return;
    setIsLoading(true);
    router.push('/tasks');
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/80 bg-background/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/sign-in" className="flex items-center gap-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-indigo-500">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white"><ListTodo className="h-5 w-5" /></span>
            <span className="text-base font-bold text-foreground sm:text-lg">TaskFlow <span className="text-indigo-500">AI</span></span>
          </Link>
          <ProductNavLinks active="home" compact />
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_440px] lg:py-16">
        <section className="mx-auto max-w-xl lg:mx-0">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">
            <Users className="h-3.5 w-3.5" /> Shared demo workspace
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">Your work, organized around you.</h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
            Organize tasks and ask questions about documents in one TaskFlow AI workspace.
          </p>
          <Link href="/documents" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            <BookOpen className="h-4 w-4" /> Documents &amp; AI Assistant <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>

        <section className="mx-auto w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-lg sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">Welcome to TaskFlow AI</h2>
            <p className="mt-1 text-sm text-muted-foreground">Continue to the shared demo dashboard.</p>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={continueToDashboard}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isLoading ? 'Opening dashboard…' : 'Continue to Dashboard'}
            {!isLoading && <ArrowRight className="h-4 w-4" />}
          </button>

          <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
            This demo has no sign-in or private accounts. Visitors share access to tasks and documents.
          </p>
          <div className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">
            Please do not add private or sensitive information.
          </div>
        </section>
      </div>
    </main>
  );
}
