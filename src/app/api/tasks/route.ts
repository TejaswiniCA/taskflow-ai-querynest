import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getTasksPool } from '@/lib/tasks/db';
import { createTaskHandlers } from '@/lib/tasks/handlers';

export const dynamic = 'force-dynamic';

const handlers = createTaskHandlers({
  getUser: getAuthenticatedUser,
  query: (sql, values) => getTasksPool().query(sql, values),
});

export async function GET(request: NextRequest) {
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  return handlers.POST(request);
}
