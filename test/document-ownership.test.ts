import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { StoredDocument } from '../src/lib/rag/db';
import { createDocumentHandlers } from '../src/lib/rag/document-handlers';
import { PUBLIC_DEMO_OWNER_ID } from '../src/lib/demo-owner';
import { documentBelongsToUser, retrieveOwnedChunks } from '../src/lib/rag/owned-document';

const docs: StoredDocument[] = [
  { id: 'shared-doc', ownerUserId: PUBLIC_DEMO_OWNER_ID, title: 'Shared', filename: 'shared.txt', sizeBytes: 1, pageCount: 1, suggestedQuestions: [], createdAt: new Date() },
  { id: 'other-owner-doc', ownerUserId: 'another-owner', title: 'Other', filename: 'other.txt', sizeBytes: 1, pageCount: 1, suggestedQuestions: [], createdAt: new Date() },
  { id: 'legacy', ownerUserId: null, title: 'Legacy', filename: 'old.txt', sizeBytes: 1, pageCount: 1, suggestedQuestions: [], createdAt: new Date() },
];

const request = (url: string) => new Request(url);

describe('public demo document scope', () => {
  it('lists only the shared demo namespace without a session', async () => {
    let listedFor = '';
    const handlers = createDocumentHandlers({
      ownerUserId: PUBLIC_DEMO_OWNER_ID,
      listDocuments: async ownerId => { listedFor = ownerId; return docs.filter(doc => doc.ownerUserId === ownerId); },
      deleteDocument: async () => false,
    });
    const response = await handlers.GET(request('http://localhost/api/documents'));
    const body = await response.json() as { documents: Array<{ id: string }> };
    assert.equal(response.status, 200);
    assert.equal(listedFor, PUBLIC_DEMO_OWNER_ID);
    assert.deepEqual(body.documents.map(doc => doc.id), ['shared-doc']);
  });

  it('does not delete a document outside the shared namespace', async () => {
    let deleteOwner = '';
    const handlers = createDocumentHandlers({
      ownerUserId: PUBLIC_DEMO_OWNER_ID,
      listDocuments: async () => [],
      deleteDocument: async (id, ownerId) => {
        deleteOwner = ownerId;
        const index = docs.findIndex(doc => doc.id === id && doc.ownerUserId === ownerId);
        if (index < 0) return false;
        docs.splice(index, 1);
        return true;
      },
    });
    const response = await handlers.DELETE(request('http://localhost/api/documents?id=other-owner-doc'));
    assert.equal(response.status, 404);
    assert.equal(deleteOwner, PUBLIC_DEMO_OWNER_ID);
    assert.ok(docs.some(doc => doc.id === 'other-owner-doc'));
  });

  it('requires the server-selected namespace for direct document reads', async () => {
    let queryValues: unknown[] = [];
    const exists = await documentBelongsToUser(async (sql, values) => {
      assert.match(sql, /WHERE id = \$1 AND owner_user_id = \$2/);
      queryValues = values;
      return { rows: values[0] === 'other-owner-doc' && values[1] === 'another-owner' ? [{ id: 'other-owner-doc' }] : [] };
    }, 'other-owner-doc', PUBLIC_DEMO_OWNER_ID);
    assert.equal(exists, false);
    assert.deepEqual(queryValues, ['other-owner-doc', PUBLIC_DEMO_OWNER_ID]);
  });

  it('filters retrieved chunks by document owner in the database query', async () => {
    let queryValues: unknown[] = [];
    const chunks = await retrieveOwnedChunks(async (sql, values) => {
      assert.match(sql, /INNER JOIN documents d ON d\.id = c\.document_id/);
      assert.match(sql, /d\.owner_user_id = \$3/);
      queryValues = values;
      const ownerMatches = values[1] === 'other-owner-doc' && values[2] === 'another-owner';
      return { rows: ownerMatches ? [{ id: 'chunk-x', document_id: 'other-owner-doc', page_number: 1, chunk_index: 0, chunk_text: 'other data', similarity: 1 }] : [] };
    }, 'other-owner-doc', PUBLIC_DEMO_OWNER_ID, '[0.1,0.2]', 4);
    assert.deepEqual(queryValues, ['[0.1,0.2]', 'other-owner-doc', PUBLIC_DEMO_OWNER_ID, 4]);
    assert.deepEqual(chunks, []);
  });
});
