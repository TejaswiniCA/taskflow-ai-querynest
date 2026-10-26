import type { Metadata } from 'next';
import { SignInPanel } from '@/components/auth/sign-in-panel';

export const metadata: Metadata = {
  title: 'Continue — TaskFlow AI',
  description: 'Enter the shared TaskFlow AI demo workspace.',
};

export default function SignInPage() {
  return <SignInPanel />;
}
