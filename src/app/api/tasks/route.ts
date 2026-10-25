import { NextRequest, NextResponse } from 'next/server';
import { getTasksPool } from '@/lib/tasks/db';
import { validateCreateTask } from '@/lib/tasks/validation';
import { Task } from '@/lib/tasks/types';
import type { AuthenticatedUser } from '@/lib/auth';
import {
  AuthConfigurationError,
  AuthServiceUnavailableError,
  getAuthenticatedUser,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getRequestUser(requestHeaders: Headers): Promise<
  | { user: AuthenticatedUser; response?: never }
  | { user?: never; response: NextResponse }
> {
  try {
    const user = await getAuthenticatedUser(requestHeaders);
    if (!user) {
      return {
        response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }),
      };
    }
    return { user };
  } catch (error) {
    const isConfigurationError = error instanceof AuthConfigurationError;
    const isUnavailableError = error instanceof AuthServiceUnavailableError;
    return {
      response: NextResponse.json(
        {
          error: isConfigurationError
            ? 'Authentication is not configured.'
            : isUnavailableError
              ? 'Authentication service is unavailable.'
              : 'Authentication request failed.',
        },
        { status: isConfigurationError || isUnavailableError ? 503 : 500 }
      ),
    };
  }
}

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

export async function GET(request: NextRequest) {
  const authResult = await getRequestUser(request.headers);
  if (authResult.response) return authResult.response;

  try {
    const result = await getTasksPool().query<Task>(
      `SELECT id, title, description, priority, status,
              due_date AS "dueDate", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM tasks
       WHERE user_id = $1
       ORDER BY created_at DESC, id DESC`,
      [authResult.user.id]
    );

    return NextResponse.json({ tasks: result.rows });
  } catch (error) {
    if (isDatabaseUnavailable(error)) return databaseErrorResponse();
    return NextResponse.json({ error: 'Failed to list tasks.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await getRequestUser(request.headers);
  if (authResult.response) return authResult.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must contain valid JSON.' }, { status: 400 });
  }

  const validation = validateCreateTask(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const { title, description, priority, status, dueDate } = validation.value;
    const result = await getTasksPool().query<Task>(
      `INSERT INTO tasks (user_id, title, description, priority, status, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, description, priority, status,
                 due_date AS "dueDate", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [authResult.user.id, title, description, priority, status, dueDate]
    );

    return NextResponse.json({ task: result.rows[0] }, { status: 201 });
  } catch (error) {
    if (isDatabaseUnavailable(error)) return databaseErrorResponse();
    return NextResponse.json({ error: 'Failed to create task.' }, { status: 500 });
  }
}
