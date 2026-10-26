import type { Metadata } from 'next';
import { TaskDashboard } from '@/components/tasks/task-dashboard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'TaskFlow AI — My Tasks',
  description: 'Create and organize your tasks in TaskFlow AI.',
};

export default function TasksPage() {
  return <TaskDashboard />;
}
