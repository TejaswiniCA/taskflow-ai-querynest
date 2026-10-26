import { headers } from 'next/headers';
import { QueryNestWorkspace } from '@/components/querynest/querynest-workspace';
import { getAuthenticatedUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  let user;
  try {
    user = await getAuthenticatedUser(await headers());
  } catch {
    redirect('/sign-in?error=setup_required');
  }
  if (!user) redirect('/sign-in?callbackURL=%2Fdocuments');
  return <QueryNestWorkspace userEmail={user.email} authMode={user.authMode} />;
}
