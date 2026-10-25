import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AlertTriangle, ArrowRight, BookOpen, CheckSquare, Sparkles } from 'lucide-react';
import { ProductNavigation } from '@/components/layout/product-navigation';
import { getAuthenticatedUser } from '@/lib/auth';
import { getTaskStatsForUser } from '@/lib/tasks/db';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'TaskFlow AI — Home',
  description: 'Your personal task and document workspace.',
};

export default async function HomePage() {
  let user;
  try {
    user = await getAuthenticatedUser(await headers());
  } catch {
    redirect('/sign-in?error=setup_required');
  }
  if (!user) redirect('/sign-in');

  let taskStats = null;
  try {
    taskStats = await getTaskStatsForUser(user.id);
  } catch {
    // Keep Home usable when PostgreSQL is temporarily unavailable.
  }

  return (
    <div className="min-h-screen bg-background">
      <ProductNavigation active="home" userEmail={user.email} authMode={user.authMode} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-card to-card px-6 py-9 sm:px-10 sm:py-12">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="relative max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-background/70 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" />
              Your personal workspace
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
              Welcome back{user.name ? `, ${user.name}` : ''}.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Keep your next steps organized and find answers in your documents from one workspace.
            </p>
          </div>
        </section>

        <div role="note" className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>
            TaskFlow is account-protected. QueryNest document and chat APIs are not yet scoped to your account. Keep the app on localhost until document access is also protected.
          </p>
        </div>

        <section aria-labelledby="task-overview-heading" className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your workload</p>
              <h2 id="task-overview-heading" className="mt-1 text-xl font-semibold text-foreground">Task overview</h2>
            </div>
            <Link href="/tasks" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              View tasks <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {taskStats ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <TaskStat label="Total tasks" value={taskStats.total} />
              <TaskStat label="Pending" value={taskStats.pending} />
              <TaskStat label="In progress" value={taskStats.inProgress} />
              <TaskStat label="Completed" value={taskStats.completed} />
            </div>
          ) : (
            <p role="status" className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              Task statistics are temporarily unavailable. Your tasks are still available from My Tasks.
            </p>
          )}
        </section>

        <section aria-label="Workspace areas" className="mt-8 grid gap-5 lg:grid-cols-2">
          <WorkspaceCard
            href="/tasks"
            icon={<CheckSquare className="h-5 w-5" />}
            eyebrow="Plan and prioritize"
            title="My Tasks"
            description="Create tasks, set a priority and due date, and keep an eye on what is pending or complete."
            action="Open My Tasks"
            color="indigo"
          />
          <WorkspaceCard
            href="/documents"
            icon={<BookOpen className="h-5 w-5" />}
            eyebrow="Ask with sources"
            title="Documents & AI Assistant"
            description="Upload a PDF or text file and ask grounded questions with page-level citations."
            action="Open Documents & AI Assistant"
            color="emerald"
          />
        </section>
      </main>
    </div>
  );
}

function TaskStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-4 shadow-sm sm:px-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function WorkspaceCard({
  href,
  icon,
  eyebrow,
  title,
  description,
  action,
  color,
}: {
  href: string;
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  color: 'indigo' | 'emerald';
}) {
  const iconColor = color === 'indigo'
    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';

  return (
    <Link
      href={href}
      className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-500/30 hover:shadow-md focus-visible:ring-2 focus-visible:ring-indigo-500 sm:p-7"
    >
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconColor}`}>{icon}</span>
      <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">{description}</p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
        {action}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
