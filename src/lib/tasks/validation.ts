import { CreateTaskInput, TaskPriority, TaskStatus, UpdateTaskInput } from './types';

const priorities: TaskPriority[] = ['low', 'medium', 'high'];
const statuses: TaskStatus[] = ['pending', 'in_progress', 'completed'];

export type ValidationResult =
  | { ok: true; value: CreateTaskInput }
  | { ok: false; error: string };

export type UpdateValidationResult =
  | { ok: true; value: UpdateTaskInput }
  | { ok: false; error: string };

const allowedFields = new Set(['title', 'description', 'priority', 'status', 'due_date']);

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

function validateTaskFields(value: Record<string, unknown>, partial: boolean):
  | { ok: true; value: UpdateTaskInput }
  | { ok: false; error: string } {
  const result: UpdateTaskInput = {};

  if (!partial || Object.prototype.hasOwnProperty.call(value, 'title')) {
    if (typeof value.title !== 'string' || !value.title.trim()) {
      return { ok: false, error: 'Title is required and cannot be empty.' };
    }
    const title = value.title.trim();
    if (title.length > 200) {
      return { ok: false, error: 'Title must be 200 characters or fewer.' };
    }
    result.title = title;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(value, 'description')) {
    const description = value.description === undefined ? '' : value.description;
    if (typeof description !== 'string') {
      return { ok: false, error: 'Description must be a string.' };
    }
    if (description.length > 10000) {
      return { ok: false, error: 'Description must be 10,000 characters or fewer.' };
    }
    result.description = description;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(value, 'priority')) {
    const priority = value.priority === undefined ? 'medium' : value.priority;
    if (typeof priority !== 'string' || !priorities.includes(priority as TaskPriority)) {
      return { ok: false, error: 'Priority must be low, medium, or high.' };
    }
    result.priority = priority as TaskPriority;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(value, 'status')) {
    const status = value.status === undefined ? 'pending' : value.status;
    if (typeof status !== 'string' || !statuses.includes(status as TaskStatus)) {
      return { ok: false, error: 'Status must be pending, in_progress, or completed.' };
    }
    result.status = status as TaskStatus;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(value, 'due_date')) {
    const dueDate = normalizeDueDate(value.due_date);
    if (dueDate === undefined) {
      return { ok: false, error: 'due_date must be a valid YYYY-MM-DD date or ISO timestamp.' };
    }
    result.dueDate = dueDate;
  }

  return { ok: true, value: result };
}

function validateTaskRecord(value: unknown):
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: string } {
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

  const unknownField = Object.keys(value).find(key => !allowedFields.has(key));
  if (unknownField) {
    return { ok: false, error: `Unsupported task field: ${unknownField}.` };
  }

  return { ok: true, value };
}

export function validateCreateTask(value: unknown): ValidationResult {
  const record = validateTaskRecord(value);
  if (!record.ok) return record;
  const fields = validateTaskFields(record.value, false);
  if (!fields.ok) return fields;

  return {
    ok: true,
    value: {
      title: fields.value.title!,
      description: fields.value.description!,
      priority: fields.value.priority!,
      status: fields.value.status!,
      dueDate: fields.value.dueDate!,
    },
  };
}

export function validateUpdateTask(value: unknown): UpdateValidationResult {
  const record = validateTaskRecord(value);
  if (!record.ok) return record;
  if (Object.keys(record.value).length === 0) {
    return { ok: false, error: 'Provide at least one task field to update.' };
  }
  return validateTaskFields(record.value, true);
}
