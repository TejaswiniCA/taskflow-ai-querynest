'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, BookOpen, Loader2, LockKeyhole, ListTodo } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { ProductNavLinks } from '@/components/layout/product-navigation';

export function SignInPanel({
  authReady,
  initialMessage,
}: {
  authReady: boolean;
  initialMessage: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'register' | 'sign-in'>('sign-in');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(initialMessage);

  const startGoogleFlow = async (requestSignUp: boolean) => {
    if (isLoading || !authReady) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await authClient.signIn.social({
        provider: 'google',
        requestSignUp,
        callbackURL: '/tasks',
        errorCallbackURL: '/sign-in?error=account_not_allowed',
      });
      if (result.error) {
        setError('Google sign-in could not be started. Check the OAuth setup and try again.');
        setIsLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError('Google sign-in could not be started. Check the OAuth setup and try again.');
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/80 bg-background/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/sign-in" className="flex items-center gap-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-indigo-500">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <ListTodo className="h-5 w-5" />
            </span>
            <span className="text-base font-bold text-foreground sm:text-lg">TaskFlow <span className="text-indigo-500">AI</span></span>
          </Link>
          <ProductNavLinks active="home" compact />
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_440px] lg:py-16">
        <section className="mx-auto max-w-xl lg:mx-0">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">
            <LockKeyhole className="h-3.5 w-3.5" />
            Private personal workspace
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            Your work, organized around you.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
            Sign in with the Google account configured for this workspace to manage your tasks. Only that verified account is accepted.
          </p>
          <Link href="/documents" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            <BookOpen className="h-4 w-4" />
            Documents & AI Assistant <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>

        <section className="mx-auto w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-lg sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">
              {mode === 'register' ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === 'register'
                ? 'Your first authorized Google sign-in creates your personal account.'
                : 'Sign in to continue to your TaskFlow AI workspace.'}
            </p>
          </div>

          {!authReady && (
            <div role="status" className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>Authentication is not ready. Configure the local OAuth settings and apply the reviewed Better Auth migration before signing in.</p>
            </div>
          )}

          {error && (
            <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <button
            type="button"
            disabled={!authReady || isLoading}
            onClick={() => void startGoogleFlow(mode === 'register')}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark />}
            {isLoading
              ? 'Connecting to Google…'
              : mode === 'register'
                ? 'Create account with Google'
                : 'Continue with Google'}
          </button>

          <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
            Access is checked on the server against the configured verified Google email.
          </p>

          <div className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">
            {mode === 'register' ? 'Already registered?' : 'New to TaskFlow AI?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(current => current === 'register' ? 'sign-in' : 'register');
                setError(null);
              }}
              className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              {mode === 'register' ? 'Sign in' : 'Create your account'}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-4 w-4 rounded-full bg-white p-0.5">
      <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.8 6-15Z" />
      <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.1c-1.8 1.2-4 1.9-6.8 1.9-5.2 0-9.6-3.5-11.2-8.2H5.9v5.2A20 20 0 0 0 24 44Z" />
      <path fill="#FBBC05" d="M12.8 27.7a12 12 0 0 1 0-7.4v-5.2H5.9a20 20 0 0 0 0 17.8l6.9-5.2Z" />
      <path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.8-5.8A19.4 19.4 0 0 0 24 4 20 20 0 0 0 5.9 15.1l6.9 5.2c1.6-4.7 6-8.2 11.2-8.2Z" />
    </svg>
  );
}
