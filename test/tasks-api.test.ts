import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTaskHandlers } from '../src/lib/tasks/handlers';
import { PUBLIC_DEMO_OWNER_ID } from '../src/lib/demo-owner';

const task = { id: '4d5133e5-65e0-48f9-a12c-4cb87f20c91b', title: 'Shared task', description: '', priority: 'medium', status: 'pending', dueDate: null, createdAt: new Date(), updatedAt: new Date() };
const request = (method: string, url: string, body?: unknown) => new Request(url, {
  method,
  headers: { host: '127.0.0.1:3000', ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

describe('public demo task API handlers', () => {
  it('lists the shared demo owner tasks without a session', async () => {
    let observed: unknown[] = [];
    const handlers = createTaskHandlers({ ownerUserId: PUBLIC_DEMO_OWNER_ID, query: async (_sql, values) => { observed = values ?? []; return { rows: [task] }; } });
    const response = await handlers.GET(request('GET', 'http://localhost/api/tasks'));
    assert.equal(response.status, 200);
    assert.deepEqual(observed, [PUBLIC_DEMO_OWNER_ID]);
    assert.match(await response.text(), /Shared task/);
  });

  it('creates a task in the shared demo owner namespace without a session', async () => {
    let observedValues: unknown[] = [];
    const handlers = createTaskHandlers({ ownerUserId: PUBLIC_DEMO_OWNER_ID, query: async (_sql, values) => { observedValues = values ?? []; return { rows: [task] }; } });
    const response = await handlers.POST(request('POST', 'http://localhost/api/tasks', { title: 'Shared task' }));
    assert.equal(response.status, 201);
    assert.equal(observedValues[0], PUBLIC_DEMO_OWNER_ID);
  });

  it('does not accept a browser-supplied owner ID', async () => {
    let queries = 0;
    const handlers = createTaskHandlers({ ownerUserId: PUBLIC_DEMO_OWNER_ID, query: async () => { queries++; return { rows: [] }; } });
    const response = await handlers.POST(request('POST', 'http://localhost/api/tasks', { title: 'Test', user_id: 'someone-else' }));
    assert.equal(response.status, 400);
    assert.equal(queries, 0);
  });

  it('keeps updates and deletes scoped to the shared demo owner', async () => {
    let observed: unknown[] = [];
    const handlers = createTaskHandlers({ ownerUserId: PUBLIC_DEMO_OWNER_ID, query: async (_sql, values) => { observed = values ?? []; return { rows: [{ id: task.id }] }; } });
    assert.equal((await handlers.PATCH(request('PATCH', `http://localhost/api/tasks/${task.id}`, { status: 'completed' }))).status, 200);
    assert.deepEqual(observed, ['completed', task.id, PUBLIC_DEMO_OWNER_ID]);
    assert.equal((await handlers.DELETE(request('DELETE', `http://localhost/api/tasks/${task.id}`))).status, 200);
    assert.deepEqual(observed, [task.id, PUBLIC_DEMO_OWNER_ID]);
  });
});
