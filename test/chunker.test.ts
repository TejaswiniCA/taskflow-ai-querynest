import { describe, it } from 'node:test';
import assert from 'node:assert';
import { chunkPages, estimateTokens } from '../src/lib/rag/chunker';
import { ExtractedPage } from '../src/lib/rag/extractor';

describe('Document Chunker Module', () => {
  it('should accurately estimate tokens using character length', () => {
    assert.strictEqual(estimateTokens('hello'), 2); // 5 / 4 = 1.25 -> 2
    assert.strictEqual(estimateTokens(''), 1); // min 1
    assert.strictEqual(estimateTokens('a'.repeat(3200)), 800); // 3200 / 4 = 800
  });

  it('should keep a short single page within a single chunk', () => {
    const pages: ExtractedPage[] = [
      {
        pageNumber: 1,
        text: 'This is a brief introductory page that easily fits within 800 tokens.',
      },
    ];

    const chunks = chunkPages(pages, { targetTokens: 800, overlapTokens: 100 });
    assert.strictEqual(chunks.length, 1);
    assert.strictEqual(chunks[0].pageNumber, 1);
    assert.strictEqual(chunks[0].text, pages[0].text);
  });

  it('should split long content across sentences into overlapping chunks', () => {
    // 80 sentences > 5600 characters > 3200 target chars
    const sentences = Array.from(
      { length: 80 },
      (_, i) => `Sentence number ${i + 1} provides key context and detail for this document section.`
    );
    const pages: ExtractedPage[] = [
      {
        pageNumber: 3,
        text: sentences.join(' '),
      },
    ];

    const chunks = chunkPages(pages, { targetTokens: 400, overlapTokens: 50 });
    assert.ok(chunks.length > 1, `Expected more than 1 chunk, got ${chunks.length}`);

    // All chunks should retain pageNumber 3
    for (const chunk of chunks) {
      assert.strictEqual(chunk.pageNumber, 3);
      assert.ok(chunk.text.length > 0);
    }

    // Verify overlap: tail of chunk 0 should appear in chunk 1
    const chunk0Words = chunks[0].text.split(' ');
    const overlapKeyword = chunk0Words[chunk0Words.length - 2];
    assert.ok(
      chunks[1].text.includes(overlapKeyword),
      `Expected chunk 1 to contain overlap from chunk 0 tail keyword: "${overlapKeyword}"`
    );
  });

  it('should preserve page numbers across multi-page documents', () => {
    const pages: ExtractedPage[] = [
      { pageNumber: 1, text: 'Title page and abstract.' },
      { pageNumber: 2, text: 'Introduction and related literature review.' },
      { pageNumber: 5, text: 'Experimental results and discussion section.' },
    ];

    const chunks = chunkPages(pages, { targetTokens: 800, overlapTokens: 100 });
    assert.strictEqual(chunks.length, 3);
    assert.strictEqual(chunks[0].pageNumber, 1);
    assert.strictEqual(chunks[1].pageNumber, 2);
    assert.strictEqual(chunks[2].pageNumber, 5);
  });

  it('should discard empty or whitespace-only pages', () => {
    const pages: ExtractedPage[] = [
      { pageNumber: 1, text: '   ' },
      { pageNumber: 2, text: 'Valid page content.' },
      { pageNumber: 3, text: '' },
    ];

    const chunks = chunkPages(pages);
    assert.strictEqual(chunks.length, 1);
    assert.strictEqual(chunks[0].pageNumber, 2);
  });
});
