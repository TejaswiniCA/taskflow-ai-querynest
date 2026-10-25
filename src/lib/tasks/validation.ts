import { CreateTaskInput, TaskPriority, TaskStatus } from './types';

const priorities: TaskPriority[] = ['low', 'medium', 'high'];
const statuses: TaskStatus[] = ['pending', 'in_progress', 'completed'];

export type ValidationResult =
  | { ok: true; value: CreateTaskInput }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeDueDate(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return undefined;

  // Support date inputs as well as ISO timestamps, while rejecting ambiguous
  // date formats that JavaScript might parse differently across environments.
  const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const timestampMatch =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value);
  if (!dateOnlyMatch && !timestampMatch) return undefined;

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return undefined;
  const datePart = value.slice(0, 10);
  const parsedDate = new Date(`${datePart}T00:00:00.000Z`);
  if (parsedDate.toISOString().slice(0, 10) !== datePart) return undefined;
  return parsed.toISOString();
}

export function validateCreateTask(value: unknown): ValidationResult {
  if (!isRecord(value)) {
    return { ok: false, error: 'Request body must be a JSON object.' };
  }

  if (Object.prototype.hasOwnProperty.call(value, 'user_id') ||
      Object.prototype.hasOwnProperty.call(value, 'userId')) {
    return {
      ok: false,
      error: 'User identity is assigned by the server and cannot be provided in the request.',
    };
  }

  if (typeof value.title !== 'string' || !value.title.trim()) {
    return { ok: false, error: 'Title is required and cannot be empty.' };
  }
  const title = value.title.trim();
  if (title.length > 200) {
    return { ok: false, error: 'Title must be 200 characters or fewer.' };
  }

  const description = value.description === undefined ? '' : value.description;
  if (typeof description !== 'string') {
    return { ok: false, error: 'Description must be a string.' };
  }
  if (description.length > 10000) {
    return { ok: false, error: 'Description must be 10,000 characters or fewer.' };
  }

  const priority = value.priority === undefined ? 'medium' : value.priority;
  if (typeof priority !== 'string' || !priorities.includes(priority as TaskPriority)) {
    return { ok: false, error: 'Priority must be low, medium, or high.' };
  }

  const status = value.status === undefined ? 'pending' : value.status;
  if (typeof status !== 'string' || !statuses.includes(status as TaskStatus)) {
    return { ok: false, error: 'Status must be pending, in_progress, or completed.' };
  }

  const dueDate = normalizeDueDate(value.due_date);
  if (dueDate === undefined) {
    return { ok: false, error: 'due_date must be a valid YYYY-MM-DD date or ISO timestamp.' };
  }

  return {
    ok: true,
    value: {
      title,
      description,
      priority: priority as TaskPriority,
      status: status as TaskStatus,
      dueDate,
    },
  };
}
