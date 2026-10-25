import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignInPanel } from '@/components/auth/sign-in-panel';
import { getAuthenticatedUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign in — TaskFlow AI',
  description: 'Sign in to your personal TaskFlow AI workspace.',
};

const errorMessages: Record<string, string> = {
  account_not_allowed: 'This Google account is not authorized for this personal workspace.',
  setup_required: 'Authentication setup is incomplete. Configure the local auth variables and apply the reviewed database migration.',
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  let authReady = false;
  let user = null;
  try {
    user = await getAuthenticatedUser(await headers());
    authReady = true;
  } catch {
    authReady = false;
  }
  if (user) redirect('/');

  const { error } = await searchParams;
  const initialMessage = error ? errorMessages[error] ?? 'Sign-in could not be completed. Try again.' : null;

  return <SignInPanel authReady={authReady} initialMessage={initialMessage} />;
}
