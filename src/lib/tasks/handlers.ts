import { NextResponse } from 'next/server';
import { validateCreateTask, validateUpdateTask } from './validation';

interface TaskQueryResult {
  rows: Array<Record<string, unknown>>;
}

export interface TaskApiDependencies {
  ownerUserId: string;
  query(sql: string, values?: unknown[]): Promise<TaskQueryResult>;
}

const taskSelect = `id, title, description, priority, status,
                    due_date AS "dueDate", created_at AS "createdAt", updated_at AS "updatedAt"`;

function databaseErrorResponse() {
  return NextResponse.json(
    { error: 'Task database is unavailable. Check the local database configuration and migration.' },
    { status: 503 }
  );
}

function isDatabaseUnavailable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code?.startsWith('08') === true ||
    ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', '57P01', '53300', '42P01'].includes(
      candidate.code ?? ''
    ) ||
    candidate.message === 'Task database is not configured.'
  );
}

function parseTaskId(pathname: string): string | null {
  const id = pathname.split('/').filter(Boolean).at(-1);
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }
  return id;
}

async function readJson(request: Request): Promise<
  | { ok: true; value: unknown }
  | { ok: false; response: NextResponse }
> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Request body must contain valid JSON.' }, { status: 400 }),
    };
  }
}

export function createTaskHandlers(dependencies: TaskApiDependencies) {
  async function GET(request: Request) {
    void request;
    try {
      const result = await dependencies.query(
        `SELECT ${taskSelect}
         FROM tasks
         WHERE user_id = $1
         ORDER BY created_at DESC, id DESC`,
        [dependencies.ownerUserId]
      );
      return NextResponse.json({ tasks: result.rows });
    } catch (error) {
      if (isDatabaseUnavailable(error)) return databaseErrorResponse();
      return NextResponse.json({ error: 'Failed to list tasks.' }, { status: 500 });
    }
  }

  async function POST(request: Request) {
    const json = await readJson(request);
    if (!json.ok) return json.response;

    const validation = validateCreateTask(json.value);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    try {
      const { title, description, priority, status, dueDate } = validation.value;
      const result = await dependencies.query(
        `INSERT INTO tasks (user_id, title, description, priority, status, due_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING ${taskSelect}`,
        [dependencies.ownerUserId, title, description, priority, status, dueDate]
      );
      return NextResponse.json({ task: result.rows[0] }, { status: 201 });
    } catch (error) {
      if (isDatabaseUnavailable(error)) return databaseErrorResponse();
      return NextResponse.json({ error: 'Failed to create task.' }, { status: 500 });
    }
  }

  async function PATCH(request: Request) {
    const id = parseTaskId(new URL(request.url).pathname);
    if (!id) return NextResponse.json({ error: 'A valid task id is required.' }, { status: 400 });

    const json = await readJson(request);
    if (!json.ok) return json.response;
    const validation = validateUpdateTask(json.value);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const columnByField = {
      title: 'title',
      description: 'description',
      priority: 'priority',
      status: 'status',
      dueDate: 'due_date',
    } as const;
    const fields = Object.entries(validation.value) as [keyof typeof columnByField, unknown][];
    const assignments = fields.map(([field], index) => `${columnByField[field]} = $${index + 1}`);
    const values = fields.map(([, value]) => value);
    values.push(id, dependencies.ownerUserId);

    try {
      const result = await dependencies.query(
        `UPDATE tasks
         SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $${values.length - 1} AND user_id = $${values.length}
         RETURNING ${taskSelect}`,
        values
      );
      if (!result.rows[0]) {
        return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
      }
      return NextResponse.json({ task: result.rows[0] });
    } catch (error) {
      if (isDatabaseUnavailable(error)) return databaseErrorResponse();
      return NextResponse.json({ error: 'Failed to update task.' }, { status: 500 });
    }
  }

  async function DELETE(request: Request) {
    const id = parseTaskId(new URL(request.url).pathname);
    if (!id) return NextResponse.json({ error: 'A valid task id is required.' }, { status: 400 });

    try {
      const result = await dependencies.query(
        'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
        [id, dependencies.ownerUserId]
      );
      if (!result.rows[0]) {
        return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
      }
      return NextResponse.json({ deleted: true, id: result.rows[0].id });
    } catch (error) {
      if (isDatabaseUnavailable(error)) return databaseErrorResponse();
      return NextResponse.json({ error: 'Failed to delete task.' }, { status: 500 });
    }
  }

  return { GET, POST, PATCH, DELETE };
}
