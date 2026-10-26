import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const unhandledApiCalls = new WeakMap<Page, string[]>();
const fixtureTaskId = '11111111-1111-4111-8111-111111111111';

test.describe('TaskFlow isolated task management flow', () => {
  test.beforeEach(async ({ page }) => {
    const tasks: Array<Record<string, unknown>> = [];
    const unhandled: string[] = [];
    unhandledApiCalls.set(page, unhandled);
    await page.route('**/api/**', async route => {
      const request = route.request();
      const url = new URL(request.url());
      const method = request.method();
      if (url.pathname === '/api/tasks' && method === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tasks }) });
        return;
      }
      if (url.pathname === '/api/documents' && method === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ documents: [] }) });
        return;
      }
      if (url.pathname === '/api/tasks' && method === 'POST') {
        const body = request.postDataJSON() as Record<string, unknown>;
        const task = {
          id: fixtureTaskId,
          title: body.title,
          description: body.description ?? '',
          priority: body.priority ?? 'medium',
          status: body.status ?? 'pending',
          dueDate: body.due_date ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        tasks.unshift(task);
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ task }) });
        return;
      }
      const match = url.pathname.match(/^\/api\/tasks\/([0-9a-f-]+)$/i);
      if (match && match[1] === fixtureTaskId && method === 'PATCH') {
        const body = request.postDataJSON() as Record<string, unknown>;
        const task = tasks.find(item => item.id === fixtureTaskId)!;
        Object.assign(task, body, { dueDate: body.due_date ?? task.dueDate, updatedAt: new Date().toISOString() });
        delete task.due_date;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ task }) });
        return;
      }
      if (match && match[1] === fixtureTaskId && method === 'DELETE') {
        const index = tasks.findIndex(item => item.id === fixtureTaskId);
        if (index >= 0) tasks.splice(index, 1);
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ deleted: true, id: fixtureTaskId }) });
        return;
      }
      unhandled.push(`${method} ${url.pathname}`);
      await route.abort('blockedbyclient');
    });
    await page.goto('/tasks');
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll();
    expect(unhandledApiCalls.get(page) ?? []).toEqual([]);
  });

  test('creates, completes, edits, filters, and deletes an isolated task', async ({ page }) => {
    await expect(page.getByText('Your task list is clear')).toBeVisible();
    await page.getByRole('button', { name: 'New task' }).click();
    await page.getByLabel('Title', { exact: true }).fill('Review interview notes');
    await page.getByRole('button', { name: 'Create task' }).click();

    const card = page.getByTestId('task-card');
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Complete' }).click();
    await expect(card.getByText('Completed')).toBeVisible();
    await page.getByRole('button', { name: 'Completed 1' }).click();
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: 'Edit' }).click();
    await card.getByLabel('Edit task title').fill('Review interview notes and plan');
    await card.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Review interview notes and plan')).toBeVisible();

    page.once('dialog', dialog => dialog.accept());
    await card.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'All tasks 0' }).click();
    await expect(page.getByText('Your task list is clear')).toBeVisible();
  });

  test('navigates between Home, My Tasks, and Documents & AI Assistant', async ({ page }) => {
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Home' }).click();
    await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible();
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Documents & AI Assistant' }).click();
    await expect(page.getByText('Ask your documents. Get answers with proof.')).toBeVisible();
  });
});
