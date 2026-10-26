import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rankVectors } from '../src/lib/rag/vector-search';

describe('in-memory vector retrieval', () => {
  it('ranks relevant passages by cosine similarity and respects top-k', () => {
    const passages = [
      { pageNumber: 1, text: 'attention mechanism', embedding: [1, 0, 0] },
      { pageNumber: 2, text: 'recurrent network', embedding: [0, 1, 0] },
      { pageNumber: 3, text: 'transformer attention', embedding: [0.9, 0.1, 0] },
    ];
    const ranked = rankVectors(passages, [1, 0, 0], 2);
    assert.deepEqual(ranked.map(result => result.item.pageNumber), [1, 3]);
    assert.equal(ranked[0].similarity, 1);
  });

  it('returns no fake result for an empty collection or mismatched vector dimensions', () => {
    assert.deepEqual(rankVectors([], [1], 4), []);
    const ranked = rankVectors([{ text: 'not comparable', embedding: [1, 0] }], [1], 4);
    assert.equal(ranked[0].similarity, 0);
  });
});
