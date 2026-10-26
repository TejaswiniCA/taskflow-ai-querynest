import { NextRequest } from 'next/server';
import { PUBLIC_DEMO_OWNER_ID } from '@/lib/demo-owner';
import { getTasksPool } from '@/lib/tasks/db';
import { createTaskHandlers } from '@/lib/tasks/handlers';

export const dynamic = 'force-dynamic';

const handlers = createTaskHandlers({
  ownerUserId: PUBLIC_DEMO_OWNER_ID,
  query: (sql, values) => getTasksPool().query(sql, values),
});

export async function PATCH(request: NextRequest) {
  return handlers.PATCH(request);
}

export async function DELETE(request: NextRequest) {
  return handlers.DELETE(request);
}
