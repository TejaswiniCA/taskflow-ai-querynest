import { headers } from 'next/headers';
import { QueryNestWorkspace } from '@/components/querynest/querynest-workspace';
import { getAuthenticatedUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  let userEmail: string | null = null;
  let authMode: 'local-development' | 'better-auth' | null = null;
  try {
    const user = await getAuthenticatedUser(await headers());
    userEmail = user?.email ?? null;
    authMode = user?.authMode ?? null;
  } catch {
    // Keep QueryNest accessible as before; its APIs remain outside this auth milestone.
  }

  return <QueryNestWorkspace userEmail={userEmail} authMode={authMode} />;
}
