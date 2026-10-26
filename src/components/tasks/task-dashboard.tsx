'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  LayoutDashboard,
  ListTodo,
  Loader2,
  Plus,
  Pencil,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { ProductNavigation } from '@/components/layout/product-navigation';
import { CreateTaskInput, Task, TaskPriority, TaskStatus } from '@/lib/tasks/types';
import { cn } from '@/lib/utils';

type TaskFilter = 'all' | TaskStatus;

const filters: { value: TaskFilter; label: string }[] = [
  { value: 'all', label: 'All tasks' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];

const priorityStyles: Record<TaskPriority, string> = {
  low: 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  medium: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  high: 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300',
};

const statusStyles: Record<TaskStatus, string> = {
  pending: 'border-border bg-muted/70 text-muted-foreground',
  in_progress: 'border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  completed: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
};

const statusLabels: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
};

const initialForm: CreateTaskInput = {
  title: '',
  description: '',
  priority: 'medium',
  status: 'pending',
  dueDate: null,
};

async function getResponseError(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.error === 'string') return body.error;
  } catch {
    // Fall through to the friendly default when a server response is not JSON.
  }
  return fallback;
}

function formatDueDate(value: string | null): string {
  if (!value) return 'No due date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid due date';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function TaskCard({ task, onUpdate, onDelete }: {
  task: Task;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [dueDate, setDueDate] = useState(task.dueDate?.slice(0, 10) || '');
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority);
    setStatus(task.status);
    setDueDate(task.dueDate?.slice(0, 10) || '');
  }, [task]);

  const save = async () => {
    setBusy(true);
    try {
      setActionError(null);
      if (await onUpdate(task.id, { title, description, priority, status, due_date: dueDate || null })) setEditing(false);
      else setActionError('Could not update this task.');
    } finally { setBusy(false); }
  };

  return (
    <article data-testid="task-card" className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-500/30 hover:shadow-md sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize', priorityStyles[task.priority])}>
          {task.priority} priority
        </span>
        <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium', statusStyles[task.status])}>
          {task.status === 'completed' ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : task.status === 'in_progress' ? (
            <Clock3 className="h-3.5 w-3.5" />
          ) : (
            <Circle className="h-3.5 w-3.5" />
          )}
          {statusLabels[task.status]}
        </span>
      </div>

      {editing ? (
        <div className="mt-4 space-y-2">
          <input aria-label="Edit task title" maxLength={200} value={title} onChange={event => setTitle(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
          <textarea aria-label="Edit task description" maxLength={10000} rows={3} value={description} onChange={event => setDescription(event.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <div className="grid grid-cols-3 gap-2">
            <select aria-label="Edit task priority" value={priority} onChange={event => setPriority(event.target.value as TaskPriority)} className="h-9 rounded-lg border border-input bg-background px-2 text-xs"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select>
            <select aria-label="Edit task status" value={status} onChange={event => setStatus(event.target.value as TaskStatus)} className="h-9 rounded-lg border border-input bg-background px-2 text-xs"><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select>
            <input aria-label="Edit task due date" type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} className="h-9 min-w-0 rounded-lg border border-input bg-background px-2 text-xs" />
          </div>
        </div>
      ) : (
        <>
          <h3 className="mt-4 break-words text-lg font-semibold leading-snug text-foreground">{task.title}</h3>
          <p className="mt-2 min-h-6 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{task.description || 'No description provided.'}</p>
        </>
      )}

      <div className="mt-5 flex items-center gap-2 border-t border-border/70 pt-4 text-xs text-muted-foreground">
        <CalendarDays className="h-4 w-4 text-indigo-500" />
        <span>{formatDueDate(task.dueDate)}</span>
      </div>
      {actionError && <p role="alert" className="mt-2 text-xs text-destructive">{actionError}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {editing ? (
          <>
            <button type="button" disabled={busy || !title.trim()} onClick={() => void save()} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white disabled:opacity-60"><Save className="h-3.5 w-3.5" /> Save</button>
            <button type="button" disabled={busy} onClick={() => setEditing(false)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs"><X className="h-3.5 w-3.5" /> Cancel</button>
          </>
        ) : (
          <>
            <button type="button" disabled={busy} onClick={() => setEditing(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs"><Pencil className="h-3.5 w-3.5" /> Edit</button>
            <button type="button" disabled={busy} onClick={async () => { setActionError(null); if (!(await onUpdate(task.id, { status: task.status === 'completed' ? 'pending' : 'completed' }))) setActionError('Could not update this task.'); }} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs">{task.status === 'completed' ? 'Reopen' : 'Complete'}</button>
            <button type="button" disabled={busy} onClick={async () => { if (window.confirm(`Delete “${task.title}”?`)) { setActionError(null); if (!(await onDelete(task.id))) setActionError('Could not delete this task.'); } }} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-destructive/25 px-3 text-xs text-destructive"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
          </>
        )}
      </div>
    </article>
  );
}

export function TaskDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<CreateTaskInput>(initialForm);

  const loadTasks = useCallback(async (showLoading = true): Promise<boolean> => {
    if (showLoading) setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetch('/api/tasks', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(await getResponseError(response, 'Could not load tasks. Please try again.'));
      }

      const body = await response.json();
      if (!body || !Array.isArray(body.tasks)) {
        throw new Error('The task service returned an unexpected response. Please try again.');
      }
      setTasks(body.tasks as Task[]);
      return true;
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : 'Could not load tasks. Please try again.'
      );
      return false;
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const taskCounts = useMemo(
    () => ({
      all: tasks.length,
      pending: tasks.filter(task => task.status === 'pending').length,
      in_progress: tasks.filter(task => task.status === 'in_progress').length,
      completed: tasks.filter(task => task.status === 'completed').length,
    }),
    [tasks]
  );

  const visibleTasks = useMemo(
    () => (filter === 'all' ? tasks : tasks.filter(task => task.status === filter)),
    [filter, tasks]
  );

  const handleCreateTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setFormError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          priority: form.priority,
          status: form.status,
          due_date: form.dueDate || null,
        }),
      });

      if (!response.ok) {
        throw new Error(await getResponseError(response, 'Could not create the task. Please try again.'));
      }

      const body = await response.json();
      if (!body?.task || typeof body.task.id !== 'string') {
        throw new Error('The task service returned an unexpected response. Please try again.');
      }

      setTasks(current => [body.task as Task, ...current.filter(task => task.id !== body.task.id)]);
      setFilter('all');
      setForm(initialForm);
      setIsFormOpen(false);

      const refreshed = await loadTasks(false);
      setSuccessMessage(
        refreshed
          ? 'Task created successfully.'
          : 'Task created. The list could not refresh, so showing the new task with the current list.'
      );
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Could not create the task. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateTask = async (id: string, patch: Record<string, unknown>): Promise<boolean> => {
    setFormError(null);
    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      });
      if (!response.ok) {
        setFormError(await getResponseError(response, 'Could not update the task.'));
        return false;
      }
      const body = await response.json();
      if (!body?.task || body.task.id !== id) return false;
      setTasks(current => current.map(task => task.id === id ? body.task : task));
      return true;
    } catch {
      setFormError('Could not reach the task service. Please try again.');
      return false;
    }
  };

  const deleteTask = async (id: string): Promise<boolean> => {
    setFormError(null);
    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!response.ok) {
        setFormError(await getResponseError(response, 'Could not delete the task.'));
        return false;
      }
      setTasks(current => current.filter(task => task.id !== id));
      return true;
    } catch {
      setFormError('Could not reach the task service. Please try again.');
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ProductNavigation active="tasks" />

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="mb-7 flex flex-col justify-between gap-5 sm:mb-9 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" />
              Shared workspace
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Your tasks, in flow.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Keep your priorities clear and your next steps moving.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsFormOpen(open => !open);
              setFormError(null);
              setSuccessMessage(null);
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <Plus className="h-4 w-4" />
            {isFormOpen ? 'Close form' : 'New task'}
          </button>
        </div>

        <div role="note" className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>
            Shared demo: visitors use the same tasks and documents and can change or delete them. Do not upload private or sensitive information.
          </p>
        </div>

        <section aria-label="Task summary" className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <SummaryCard label="Total tasks" value={taskCounts.all} icon={<LayoutDashboard className="h-4 w-4" />} accent="indigo" />
          <SummaryCard label="Pending" value={taskCounts.pending} icon={<Circle className="h-4 w-4" />} accent="slate" />
          <SummaryCard label="In progress" value={taskCounts.in_progress} icon={<Clock3 className="h-4 w-4" />} accent="amber" />
          <SummaryCard label="Completed" value={taskCounts.completed} icon={<CheckCircle2 className="h-4 w-4" />} accent="emerald" />
        </section>

        {isFormOpen && (
          <section aria-labelledby="create-task-title" className="mb-8 rounded-2xl border border-indigo-500/20 bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 id="create-task-title" className="text-lg font-semibold text-foreground">Create a task</h2>
              <p className="mt-1 text-sm text-muted-foreground">Add the details now. You can refine your workflow later.</p>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label htmlFor="task-title" className="mb-1.5 block text-sm font-medium text-foreground">Title</label>
                <input
                  id="task-title"
                  name="title"
                  required
                  maxLength={200}
                  value={form.title}
                  onChange={event => setForm(current => ({ ...current, title: event.target.value }))}
                  placeholder="What needs to get done?"
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="task-description" className="mb-1.5 block text-sm font-medium text-foreground">Description <span className="font-normal text-muted-foreground">(optional)</span></label>
                <textarea
                  id="task-description"
                  name="description"
                  maxLength={10000}
                  rows={3}
                  value={form.description}
                  onChange={event => setForm(current => ({ ...current, description: event.target.value }))}
                  placeholder="Add context or a helpful next step..."
                  className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="task-priority" className="mb-1.5 block text-sm font-medium text-foreground">Priority</label>
                  <select
                    id="task-priority"
                    value={form.priority}
                    onChange={event => setForm(current => ({ ...current, priority: event.target.value as TaskPriority }))}
                    className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="task-status" className="mb-1.5 block text-sm font-medium text-foreground">Status</label>
                  <select
                    id="task-status"
                    value={form.status}
                    onChange={event => setForm(current => ({ ...current, status: event.target.value as TaskStatus }))}
                    className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="task-due-date" className="mb-1.5 block text-sm font-medium text-foreground">Due date <span className="font-normal text-muted-foreground">(optional)</span></label>
                  <input
                    id="task-due-date"
                    type="date"
                    value={form.dueDate ?? ''}
                    onChange={event => setForm(current => ({ ...current, dueDate: event.target.value || null }))}
                    className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                </div>
              </div>

              {formError && <InlineError message={formError} />}

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setFormError(null);
                  }}
                  className="h-10 rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Creating...' : 'Create task'}
                </button>
              </div>
            </form>
          </section>
        )}

        {successMessage && (
          <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            {successMessage}
          </div>
        )}

        <section aria-labelledby="task-list-title">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="task-list-title" className="text-xl font-semibold text-foreground">Your tasks</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {filter === 'all' ? `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'} in your workspace` : `${taskCounts[filter]} ${filters.find(item => item.value === filter)?.label.toLowerCase()} tasks`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadTasks()}
              disabled={isLoading}
              className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground disabled:opacity-60 sm:self-auto"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
              Refresh
            </button>
          </div>

          <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter tasks by status">
            {filters.map(item => (
              <button
                key={item.value}
                type="button"
                aria-pressed={filter === item.value}
                onClick={() => setFilter(item.value)}
                className={cn(
                  'inline-flex flex-shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500',
                  filter === item.value
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-border bg-card text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                )}
              >
                {item.label}
                <span className={cn('rounded-full px-1.5 py-0.5 text-xs', filter === item.value ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground')}>
                  {taskCounts[item.value]}
                </span>
              </button>
            ))}
          </div>

          {loadError && (
            <div role="alert" className="mb-5 flex flex-col gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>{loadError}</p>
              </div>
              <button type="button" onClick={() => void loadTasks()} className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-lg border border-destructive/25 px-3 text-sm font-medium text-destructive hover:bg-destructive/10 sm:self-auto">
                <RefreshCw className="h-3.5 w-3.5" /> Try again
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading tasks">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="h-52 animate-pulse rounded-2xl border border-border bg-card/70" />
              ))}
            </div>
          ) : !loadError && visibleTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 px-5 py-14 text-center sm:py-16">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
                {filter === 'all' ? <ListTodo className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                {filter === 'all' ? 'Your task list is clear' : `No ${filters.find(item => item.value === filter)?.label.toLowerCase()} tasks`}
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                {filter === 'all' ? 'Create your first task to start organizing what matters.' : 'Tasks with this status will appear here.'}
              </p>
              {filter === 'all' && (
                <button type="button" onClick={() => setIsFormOpen(true)} className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-500">
                  <Plus className="h-4 w-4" /> Create your first task
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleTasks.map(task => <TaskCard key={task.id} task={task} onUpdate={updateTask} onDelete={deleteTask} />)}
            </div>
          )}
        </section>

        <footer className="mt-10 flex flex-col gap-2 border-t border-border/70 pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>TaskFlow AI · Local task workspace</span>
          <Link href="/documents" className="inline-flex items-center gap-1.5 font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            <span>Open Documents & AI Assistant</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </footer>
      </main>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: 'indigo' | 'slate' | 'amber' | 'emerald';
}) {
  const accents = {
    indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  };

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', accents[accent])}>{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{value}</p>
    </article>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <p>{message}</p>
    </div>
  );
}
