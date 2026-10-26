import { Pool } from 'pg';

declare global {
  var __taskflowTasksPool: Pool | undefined;
}

function createTasksPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString?.trim()) {
    throw new Error('Task database is not configured.');
  }

  return new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

// The RAG database module has its own initialization and fallback behavior.
// Keep task queries isolated so they never initialize or change RAG tables.
// Create the pool on demand so missing configuration can become a JSON API error.
export function getTasksPool(): Pool {
  globalThis.__taskflowTasksPool ??= createTasksPool();
  return globalThis.__taskflowTasksPool;
}

export interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}

export async function getTaskStatsForUser(userId: string): Promise<TaskStats> {
  const result = await getTasksPool().query<TaskStats>(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
            COUNT(*) FILTER (WHERE status = 'in_progress')::int AS "inProgress",
            COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
     FROM tasks
     WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0];
}
