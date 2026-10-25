import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { TaskDashboard } from '@/components/tasks/task-dashboard';
import { getAuthenticatedUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'TaskFlow AI — My Tasks',
  description: 'Create and organize your tasks in TaskFlow AI.',
};

export default async function TasksPage() {
  let user;
  try {
    user = await getAuthenticatedUser(await headers());
  } catch {
    redirect('/sign-in?error=setup_required');
  }
  if (!user) redirect('/sign-in?callbackURL=%2Ftasks');

  return <TaskDashboard userEmail={user.email} authMode={user.authMode} />;
}
