import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AuthenticatedUser } from '../src/lib/auth';
import type { StoredDocument } from '../src/lib/rag/db';
import { createDocumentHandlers } from '../src/lib/rag/document-handlers';
import { documentBelongsToUser, retrieveOwnedChunks } from '../src/lib/rag/owned-document';
import { createChatOwnershipGuard } from '../src/lib/rag/chat-ownership';

const userA: AuthenticatedUser = {
  id: 'user-a', email: 'a@example.test', name: 'A', authMode: 'better-auth',
};
const userB: AuthenticatedUser = {
  id: 'user-b', email: 'b@example.test', name: 'B', authMode: 'better-auth',
};

const docs: StoredDocument[] = [
  { id: 'doc-a', ownerUserId: userA.id, title: 'A', filename: 'a.txt', sizeBytes: 1, pageCount: 1, suggestedQuestions: [], createdAt: new Date() },
  { id: 'doc-b', ownerUserId: userB.id, title: 'B', filename: 'b.txt', sizeBytes: 1, pageCount: 1, suggestedQuestions: [], createdAt: new Date() },
  { id: 'legacy', ownerUserId: null, title: 'Legacy', filename: 'old.txt', sizeBytes: 1, pageCount: 1, suggestedQuestions: [], createdAt: new Date() },
];

const request = (url: string) => new Request(url, { headers: { host: '127.0.0.1:3000' } });

describe('QueryNest document ownership', () => {
  it('prevents User A from listing User B documents and hides legacy unowned rows', async () => {
    let listedFor = '';
    const handlers = createDocumentHandlers({
      getUser: async () => userA,
      listDocuments: async ownerId => {
        listedFor = ownerId;
        return docs.filter(doc => doc.ownerUserId === ownerId);
      },
      deleteDocument: async () => false,
    });

    const response = await handlers.GET(request('http://localhost/api/documents'));
    const body = await response.json() as { documents: Array<{ id: string }> };
    assert.equal(response.status, 200);
    assert.equal(listedFor, userA.id);
    assert.deepEqual(body.documents.map(doc => doc.id), ['doc-a']);
  });

  it('prevents User A from deleting User B documents and returns not found', async () => {
    let deleteArgs: string[] = [];
    const handlers = createDocumentHandlers({
      getUser: async () => userA,
      listDocuments: async () => [],
      deleteDocument: async (documentId, ownerId) => {
        deleteArgs = [documentId, ownerId];
        const index = docs.findIndex(doc => doc.id === documentId && doc.ownerUserId === ownerId);
        if (index < 0) return false;
        docs.splice(index, 1);
        return true;
      },
    });

    const response = await handlers.DELETE(request('http://localhost/api/documents?id=doc-b&ownerUserId=user-b'));
    assert.equal(response.status, 404);
    assert.deepEqual(deleteArgs, ['doc-b', userA.id]);
    assert.ok(docs.some(doc => doc.id === 'doc-b'));
  });

  it('requires authentication before listing or deleting documents', async () => {
    let calls = 0;
    const handlers = createDocumentHandlers({
      getUser: async () => null,
      listDocuments: async () => { calls++; return []; },
      deleteDocument: async () => { calls++; return false; },
    });

    assert.equal((await handlers.GET(request('http://localhost/api/documents'))).status, 401);
    assert.equal((await handlers.DELETE(request('http://localhost/api/documents?id=doc-a'))).status, 401);
    assert.equal(calls, 0);
  });

  it('prevents User A from chatting with User B document before retrieval', async () => {
    let lookupValues: unknown[] = [];
    const ownsLookup = async (documentId: string, ownerUserId: string) => documentBelongsToUser(async (sql, values) => {
      assert.match(sql, /WHERE id = \$1 AND owner_user_id = \$2/);
      lookupValues = values;
      return { rows: values[0] === 'doc-b' && values[1] === userB.id ? [{ id: 'doc-b' }] : [] };
    }, documentId, ownerUserId);
    const authorize = createChatOwnershipGuard(ownsLookup);
    const response = await authorize('doc-b', userA.id);

    assert.equal(response?.status, 404);
    assert.deepEqual(lookupValues, ['doc-b', userA.id]);
  });

  it('does not return User B chunks to User A retrieval', async () => {
    let queryValues: unknown[] = [];
    const chunks = await retrieveOwnedChunks(async (sql, values) => {
      assert.match(sql, /INNER JOIN documents d ON d\.id = c\.document_id/);
      assert.match(sql, /d\.owner_user_id = \$3/);
      queryValues = values;
      const ownerMatches = values[1] === 'doc-b' && values[2] === userB.id;
      return {
        rows: ownerMatches ? [{
          id: 'chunk-b', document_id: 'doc-b', page_number: 1,
          chunk_index: 0, chunk_text: 'private passage', similarity: 1,
        }] : [],
      };
    }, 'doc-b', userA.id, '[0.1,0.2]', 4);

    assert.deepEqual(queryValues, ['[0.1,0.2]', 'doc-b', userA.id, 4]);
    assert.deepEqual(chunks, []);
  });
});
