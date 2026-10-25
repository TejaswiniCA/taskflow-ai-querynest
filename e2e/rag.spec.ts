import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { chunkPages } from '../src/lib/rag/chunker';
import type { DocumentChunk } from '../src/lib/rag/chunker';
import { extractTextPerPage } from '../src/lib/rag/extractor';
import type { Citation, DocumentItem } from '../src/lib/types';

const samplePdfPath = path.join(__dirname, '../docs/sample_document.pdf');
const unhandledApiCalls = new WeakMap<Page, string[]>();
const requestsByPage = new WeakMap<Page, { uploads: number; chats: number }>();

let sampleChunks: DocumentChunk[];
let samplePageCount: number;
let sampleSizeBytes: number;
let sampleTitle: string;
let sampleExcerpt: string;

test.describe('QueryNest isolated document UI flow', () => {
  test.beforeAll(async () => {
    const samplePdf = fs.readFileSync(samplePdfPath);
    sampleSizeBytes = fs.statSync(samplePdfPath).size;
    const pages = await extractTextPerPage(samplePdf, 'pdf');
    samplePageCount = pages.length;
    sampleChunks = chunkPages(pages);

    if (samplePageCount === 0 || sampleChunks.length === 0) {
      throw new Error('The bundled sample PDF did not produce readable pages and chunks.');
    }

    sampleTitle = path.basename(samplePdfPath, path.extname(samplePdfPath))
      .replace(/[_-]/g, ' ')
      .trim();
    sampleTitle = sampleTitle.charAt(0).toUpperCase() + sampleTitle.slice(1);
    sampleExcerpt = sampleChunks[0].text.replace(/\s+/g, ' ').slice(0, 100).trim();
  });

  test.beforeEach(async ({ page }, testInfo) => {
    const documents: DocumentItem[] = [];
    const unhandled: string[] = [];
    unhandledApiCalls.set(page, unhandled);
    requestsByPage.set(page, { uploads: 0, chats: 0 });

    const documentId = `e2e-${testInfo.testId}`;
    const fixtureDocument: DocumentItem = {
      id: documentId,
      title: sampleTitle,
      filename: path.basename(samplePdfPath),
      sizeBytes: sampleSizeBytes,
      pageCount: samplePageCount,
      uploadedAt: 'Test fixture',
      suggestedQuestions: [],
      initialMessages: [],
    };

    // Intercept every API request. No real app API handler, database, or document
    // store is reachable from this browser test.
    await page.route('**/api/**', async route => {
      const request = route.request();
      const url = new URL(request.url());
      const method = request.method();

      if (url.pathname === '/api/documents' && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ documents }),
        });
        return;
      }

      if (url.pathname === '/api/upload' && method === 'POST') {
        const requestCounts = requestsByPage.get(page)!;
        requestCounts.uploads += 1;
        const multipartBody = request.postDataBuffer() ?? Buffer.alloc(0);
        const hasSampleFilename = multipartBody.includes(Buffer.from(path.basename(samplePdfPath)));
        const isMultipartForm = request.headers()['content-type']?.includes('multipart/form-data') === true;

        if (!hasSampleFilename || !isMultipartForm) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'The isolated test expected a multipart upload of the bundled sample PDF.',
            }),
          });
          return;
        }

        documents.unshift(fixtureDocument);
        const chunks = sampleChunks.map(chunk => ({
          id: chunk.id,
          pageNumber: chunk.pageNumber,
          chunkIndex: chunk.chunkIndex,
          text: chunk.text,
        }));

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            document: fixtureDocument,
            chunksCount: chunks.length,
            chunks,
          }),
        });
        return;
      }

      if (url.pathname === '/api/chat' && method === 'POST') {
        const requestCounts = requestsByPage.get(page)!;
        requestCounts.chats += 1;
        const body = request.postDataJSON() as { documentId?: string; question?: string };

        if (!documents.some(document => document.id === body.documentId)) {
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'The test document is not available.' }),
          });
          return;
        }

        const isFallbackRequest = body.question === 'Tell me something absent from this source.';
        const citations: Citation[] = isFallbackRequest
          ? []
          : [{
              id: 'e2e-citation',
              pageNumber: sampleChunks[0].pageNumber,
              snippet: sampleExcerpt,
              score: 0.99,
              sectionTitle: `Page ${sampleChunks[0].pageNumber} Passage`,
            }];
        const answer = isFallbackRequest
          ? "I couldn't find that in your documents."
          : sampleExcerpt;
        const stream = [
          { type: 'citations', citations, model: 'isolated-test-fixture' },
          { type: 'delta', text: answer },
          { type: 'done' },
        ].map(event => JSON.stringify(event)).join('\n') + '\n';

        await route.fulfill({
          status: 200,
          contentType: 'application/x-ndjson; charset=utf-8',
          headers: { 'Cache-Control': 'no-cache, no-transform' },
          body: stream,
        });
        return;
      }

      unhandled.push(`${method} ${url.pathname}`);
      await route.abort('blockedbyclient');
    });

    await page.goto('/documents');
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll();
    expect(unhandledApiCalls.get(page) ?? []).toEqual([]);
  });

  test('rejects an unsupported file in the UI without calling an API', async ({ page }) => {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('Drop PDF or TXT here').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, '../package.json'));

    await expect(page.getByText('Upload Failed')).toBeVisible();
    await expect(page.getByText('Only PDF and TXT documents are supported.')).toBeVisible();
    expect(requestsByPage.get(page)?.uploads).toBe(0);
  });

  test('uploads the bundled PDF and renders a source excerpt with its citation', async ({ page }) => {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('Drop PDF or TXT here').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(samplePdfPath);

    await expect(page.getByText(sampleTitle).first()).toBeVisible();
    const question = page.getByPlaceholder(/Ask anything about/i);
    await question.fill('Summarize this document.');
    await question.press('Enter');

    await expect(page.getByText(sampleExcerpt, { exact: false }).last()).toBeVisible();
    expect(requestsByPage.get(page)?.uploads).toBe(1);
    expect(requestsByPage.get(page)?.chats).toBe(1);

    const citationButton = page.locator('button:has-text("Page")').last();
    await expect(citationButton).toBeVisible();
    await citationButton.click();
    await expect(page.getByText('Source Passage')).toBeVisible();
    await expect(
      page.getByRole('complementary', { name: 'Source Document Citation' }).getByText(sampleTitle)
    ).toBeVisible();
    await expect(page.getByText(sampleExcerpt, { exact: false }).last()).toBeVisible();
  });

  test('renders the not-found response returned by the isolated chat endpoint', async ({ page }) => {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('Drop PDF or TXT here').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(samplePdfPath);

    const question = page.getByPlaceholder(/Ask anything about/i);
    await question.fill('Tell me something absent from this source.');
    await question.press('Enter');

    await expect(page.getByText("I couldn't find that in your documents.")).toBeVisible();
    expect(requestsByPage.get(page)?.chats).toBe(1);
  });
});
