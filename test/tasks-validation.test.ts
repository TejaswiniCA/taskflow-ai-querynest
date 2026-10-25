import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateCreateTask } from '../src/lib/tasks/validation';

describe('Task creation validation', () => {
  it('accepts a title and applies database-compatible defaults', () => {
    const result = validateCreateTask({ title: '  Prepare report  ' });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.value, {
      title: 'Prepare report',
      description: '',
      priority: 'medium',
      status: 'pending',
      dueDate: null,
    });
  });

  it('accepts supported priorities, statuses, descriptions, and date inputs', () => {
    const result = validateCreateTask({
      title: 'Submit report',
      description: 'Review and submit the final draft.',
      priority: 'high',
      status: 'in_progress',
      due_date: '2026-10-30',
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.dueDate, '2026-10-30T00:00:00.000Z');
    assert.equal(result.value.status, 'in_progress');
  });

  it('rejects missing or whitespace-only titles', () => {
    assert.equal(validateCreateTask({}).ok, false);
    assert.equal(validateCreateTask({ title: '   ' }).ok, false);
  });

  it('rejects values outside database constraints', () => {
    assert.equal(validateCreateTask({ title: 'Task', priority: 'urgent' }).ok, false);
    assert.equal(validateCreateTask({ title: 'Task', status: 'blocked' }).ok, false);
    assert.equal(validateCreateTask({ title: 'Task', due_date: 'not-a-date' }).ok, false);
  });

  it('does not accept a client-provided owner identity', () => {
    assert.equal(
      validateCreateTask({ title: 'Task', user_id: 'someone-else' }).ok,
      false
    );
  });
});
