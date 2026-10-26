import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateAndSanitizeFile } from '../src/lib/rag/sanitizer';
import { extractTextPerPage } from '../src/lib/rag/extractor';
import { chunkPages, namespaceChunks } from '../src/lib/rag/chunker';

describe('document ingestion input checks', () => {
  it('rejects unsupported file types, empty text, malformed PDFs, and oversized files', () => {
    assert.throws(() => validateAndSanitizeFile({ name: 'x.docx', size: 1 }, Buffer.from('x')), /Unsupported file type/);
    assert.throws(() => validateAndSanitizeFile({ name: 'empty.txt', size: 0 }, Buffer.alloc(0)), /empty/);
    assert.throws(() => validateAndSanitizeFile({ name: 'broken.pdf', size: 4 }, Buffer.from('nope')), /malformed/);
    assert.throws(() => validateAndSanitizeFile({ name: 'large.txt', size: 5 * 1024 * 1024 + 1 }, Buffer.from('x')), /exceeds/);
  });

  it('extracts and chunks the repository sample PDF without database or AI access', async () => {
    const pdfPath = path.join(process.cwd(), 'docs/sample_document.pdf');
    const bytes = fs.readFileSync(pdfPath);
    const validated = validateAndSanitizeFile({ name: 'sample_document.pdf', size: bytes.length }, bytes);
    const pages = await extractTextPerPage(validated.buffer, validated.fileType);
    const chunks = chunkPages(pages);
    assert.ok(pages.length > 0);
    assert.ok(chunks.length > 0);
    assert.ok(chunks.every(chunk => chunk.text.trim().length > 0));
  });

  it('gives repeated document uploads distinct, document-scoped chunk identifiers', () => {
    const chunks = chunkPages([{ pageNumber: 1, text: 'Repeated source text.' }]);
    const first = namespaceChunks('doc-one', chunks);
    const second = namespaceChunks('doc-two', chunks);
    assert.notEqual(first[0].id, second[0].id);
    assert.equal(first[0].text, second[0].text);
  });
});
