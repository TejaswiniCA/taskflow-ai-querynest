import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTaskHandlers } from '../src/lib/tasks/handlers';
import type { AuthenticatedUser } from '../src/lib/auth';

const user: AuthenticatedUser = { id: 'owner-a', email: 'a@example.test', name: 'A', authMode: 'local-development' };
const task = { id: '4d5133e5-65e0-48f9-a12c-4cb87f20c91b', title: 'Owned task', description: '', priority: 'medium', status: 'pending', dueDate: null, createdAt: new Date(), updatedAt: new Date() };
const request = (method: string, url: string, body?: unknown) => new Request(url, {
  method,
  headers: { host: '127.0.0.1:3000', ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

describe('task API handlers', () => {
  it('requires a server-resolved user before querying the database', async () => {
    let queries = 0;
    const handlers = createTaskHandlers({ getUser: async () => null, query: async () => { queries++; return { rows: [] }; } });
    const response = await handlers.GET(request('GET', 'http://localhost/api/tasks'));
    assert.equal(response.status, 401);
    assert.equal(queries, 0);
  });

  it('lists only rows scoped to the authenticated user', async () => {
    let observed: unknown[] = [];
    const handlers = createTaskHandlers({ getUser: async () => user, query: async (_sql, values) => { observed = values ?? []; return { rows: [task] }; } });
    const response = await handlers.GET(request('GET', 'http://localhost/api/tasks'));
    assert.equal(response.status, 200);
    assert.deepEqual(observed, ['owner-a']);
    assert.match(await response.text(), /Owned task/);
  });

  it('rejects browser-supplied owner identity without writing', async () => {
    let queries = 0;
    const handlers = createTaskHandlers({ getUser: async () => user, query: async () => { queries++; return { rows: [] }; } });
    const response = await handlers.POST(request('POST', 'http://localhost/api/tasks', { title: 'Test', user_id: 'owner-b' }));
    assert.equal(response.status, 400);
    assert.equal(queries, 0);
  });

  it('updates a task with an owner predicate and returns 404 for another owner', async () => {
    let observedSql = '';
    let observedValues: unknown[] = [];
    const handlers = createTaskHandlers({ getUser: async () => user, query: async (sql, values) => {
      observedSql = sql; observedValues = values ?? []; return { rows: [] };
    } });
    const response = await handlers.PATCH(request('PATCH', `http://localhost/api/tasks/${task.id}`, { status: 'completed' }));
    assert.equal(response.status, 404);
    assert.match(observedSql, /WHERE id = \$2 AND user_id = \$3/);
    assert.deepEqual(observedValues, ['completed', task.id, user.id]);
  });

  it('deletes only a task owned by the current user', async () => {
    let observedValues: unknown[] = [];
    const handlers = createTaskHandlers({ getUser: async () => user, query: async (_sql, values) => {
      observedValues = values ?? []; return { rows: [{ id: task.id }] };
    } });
    const response = await handlers.DELETE(request('DELETE', `http://localhost/api/tasks/${task.id}`));
    assert.equal(response.status, 200);
    assert.deepEqual(observedValues, [task.id, user.id]);
  });
});
