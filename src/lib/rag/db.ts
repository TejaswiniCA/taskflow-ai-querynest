import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'node:crypto';
import { DocumentChunk } from './chunker';
import { rankVectors } from './vector-search';
import { documentBelongsToUser, retrieveOwnedChunks } from './owned-document';

export interface StoredDocument {
  id: string;
  ownerUserId: string | null;
  title: string;
  filename: string;
  sizeBytes: number;
  pageCount: number;
  suggestedQuestions: string[];
  createdAt: Date;
}

export interface ScoredChunk {
  id: string;
  documentId: string;
  pageNumber: number;
  chunkIndex: number;
  text: string;
  similarity: number;
}

// In-memory fallback store structure
interface MemoryChunk {
  id: string;
  documentId: string;
  pageNumber: number;
  chunkIndex: number;
  text: string;
  embedding: number[];
}

declare global {
  var __askguru_docs: Map<string, StoredDocument> | undefined;
  var __askguru_chunks: MemoryChunk[] | undefined;
}

const memoryDocuments: Map<string, StoredDocument> =
  globalThis.__askguru_docs ?? (globalThis.__askguru_docs = new Map());
const memoryChunks: MemoryChunk[] =
  globalThis.__askguru_chunks ?? (globalThis.__askguru_chunks = []);

function getDataDir(): string {
  if (
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    (process.platform !== 'win32' && process.env.NODE_ENV === 'production')
  ) {
    return path.join('/tmp', '.askguru_data');
  }
  return path.join(process.cwd(), '.data');
}

const DATA_DIR = getDataDir();
const STORE_FILE = path.join(DATA_DIR, 'local_store.json');

function saveToDisk() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const data = { docs: Array.from(memoryDocuments.entries()), chunks: memoryChunks };
  const temporaryFile = `${STORE_FILE}.${randomUUID()}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(data), { mode: 0o600 });
  fs.renameSync(temporaryFile, STORE_FILE);
}

function loadFromDisk() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data.docs && Array.isArray(data.docs)) {
        for (const [k, v] of data.docs) {
          if (!memoryDocuments.has(k)) {
            memoryDocuments.set(k, { ...v, createdAt: new Date(v.createdAt) });
          }
        }
      }
      if (data.chunks && Array.isArray(data.chunks)) {
        for (const c of data.chunks) {
          if (!memoryChunks.some(existing => existing.id === c.id)) {
            memoryChunks.push(c);
          }
        }
      }
    }
  } catch {
    // Ignore load errors
  }
}

// Initial load
loadFromDisk();

let pool: Pool | null = null;
let isInitialized = false;

function getPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || connectionString.trim() === '') {
    return null;
  }
  if (!pool) {
    let host = '';
    try { host = new URL(connectionString).hostname.toLowerCase(); } catch { throw new Error('Document database URL is invalid.'); }
    const isLoopback = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(host);
    pool = new Pool({
      connectionString,
      ssl: isLoopback ? false : { rejectUnauthorized: true },
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

/**
 * Initializes Postgres tables and pgvector extension if connection available.
 */
export async function initDb(): Promise<boolean> {
  const p = getPool();
  if (!p) {
    return false;
  }
  if (isInitialized) return true;

  try {
    const client = await p.connect();
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS vector;');

      await client.query(`
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          owner_user_id TEXT,
          title TEXT NOT NULL,
          filename TEXT NOT NULL,
          size_bytes INTEGER NOT NULL,
          page_count INTEGER NOT NULL,
          suggested_questions JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS document_chunks (
          id TEXT PRIMARY KEY,
          document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
          page_number INTEGER NOT NULL,
          chunk_index INTEGER NOT NULL,
          chunk_text TEXT NOT NULL,
          embedding vector(3072)
        );
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS document_chunks_doc_idx ON document_chunks(document_id);
      `);

      isInitialized = true;
      return true;
    } finally {
      client.release();
    }
  } catch {
    console.error('Document database initialization failed.');
    throw new Error('Document database is unavailable.');
  }
}

/**
 * Stores a document and its embedded chunks.
 */
export async function saveDocumentWithChunks(
  doc: StoredDocument,
  chunks: DocumentChunk[],
  embeddings: number[][],
  ownerUserId: string
): Promise<void> {
  const isPostgresReady = await initDb();

  if (isPostgresReady && pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO documents (id, owner_user_id, title, filename, size_bytes, page_count, suggested_questions, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
        [
          doc.id,
          ownerUserId,
          doc.title,
          doc.filename,
          doc.sizeBytes,
          doc.pageCount,
          JSON.stringify(doc.suggestedQuestions),
          doc.createdAt,
        ]
      );

      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        const emb = embeddings[i];
        const vectorStr = `[${emb.join(',')}]`;

        await client.query(
          `INSERT INTO document_chunks (id, document_id, page_number, chunk_index, chunk_text, embedding)
           VALUES ($1, $2, $3, $4, $5, $6::vector)
           ON CONFLICT (id) DO NOTHING;`,
          [c.id, doc.id, c.pageNumber, c.chunkIndex, c.text, vectorStr]
        );
      }

      await client.query('COMMIT');
      return;
    } catch {
      await client.query('ROLLBACK').catch(() => undefined);
      console.error('Document database write failed.');
      throw new Error('Could not save the document to the configured database.');
    } finally {
      client.release();
    }
  }

  // Local-only fallback when no PostgreSQL URL is configured.
  memoryDocuments.set(doc.id, { ...doc, ownerUserId });
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    memoryChunks.push({
      id: c.id,
      documentId: doc.id,
      pageNumber: c.pageNumber,
      chunkIndex: c.chunkIndex,
      text: c.text,
      embedding: embeddings[i],
    });
  }
  try { saveToDisk(); } catch {
    memoryDocuments.delete(doc.id);
    for (let i = memoryChunks.length - 1; i >= 0; i--) if (memoryChunks[i].documentId === doc.id) memoryChunks.splice(i, 1);
    throw new Error('Could not persist the document to the local store.');
  }
}

/**
 * Retrieves the top-K chunks for a document using vector cosine distance.
 */
export async function searchSimilarChunks(
  documentId: string,
  ownerUserId: string,
  queryEmbedding: number[],
  topK = 4
): Promise<ScoredChunk[]> {
  const isPostgresReady = await initDb();

  if (isPostgresReady && pool) {
    try {
      const vectorStr = `[${queryEmbedding.join(',')}]`;
      const rows = await retrieveOwnedChunks(
        (sql, values) => pool!.query(sql, values),
        documentId,
        ownerUserId,
        vectorStr,
        topK
      );

      return rows.map(r => ({
        id: r.id,
        documentId: r.document_id,
        pageNumber: r.page_number,
        chunkIndex: r.chunk_index,
        text: r.chunk_text,
        similarity: parseFloat(String(r.similarity)),
      }));
    } catch {
      console.error('Document database retrieval failed.');
      throw new Error('Could not retrieve document passages from the configured database.');
    }
  }

  // In-memory vector cosine similarity calculation
  loadFromDisk();
  const storedDocument = memoryDocuments.get(documentId);
  if (!storedDocument || storedDocument.ownerUserId !== ownerUserId) return [];
  const docChunks = memoryChunks.filter(c => c.documentId === documentId);

  // If there are few chunks, return all of them
  if (docChunks.length === 0) {
    return [];
  }

  return rankVectors(docChunks, queryEmbedding, topK).map(({ item, similarity }) => ({
    id: item.id,
    documentId: item.documentId,
    pageNumber: item.pageNumber,
    chunkIndex: item.chunkIndex,
    text: item.text,
    similarity,
  }));
}

/**
 * Deletes a stored document and its associated chunks.
 */
export async function ownsStoredDocument(documentId: string, ownerUserId: string): Promise<boolean> {
  const isPostgresReady = await initDb();
  if (isPostgresReady && pool) {
    try {
      return await documentBelongsToUser(
        (sql, values) => pool!.query(sql, values),
        documentId,
        ownerUserId
      );
    } catch {
      console.error('Document ownership check failed.');
      throw new Error('Could not verify document ownership.');
    }
  }
  loadFromDisk();
  return memoryDocuments.get(documentId)?.ownerUserId === ownerUserId;
}

export async function deleteStoredDocument(documentId: string, ownerUserId: string): Promise<boolean> {
  const isPostgresReady = await initDb();
  if (isPostgresReady && pool) {
    try {
      const result = await pool.query(
        'DELETE FROM documents WHERE id = $1 AND owner_user_id = $2 RETURNING id',
        [documentId, ownerUserId]
      );
      return result.rowCount === 1;
    } catch {
      console.error('Document database deletion failed.');
      throw new Error('Could not delete the document from the configured database.');
    }
  }

  const documentToDelete = memoryDocuments.get(documentId);
  if (!documentToDelete || documentToDelete.ownerUserId !== ownerUserId) return false;
  const existingDocument = memoryDocuments.get(documentId);
  const removedChunks: MemoryChunk[] = [];
  memoryDocuments.delete(documentId);
  for (let i = memoryChunks.length - 1; i >= 0; i--) {
    if (memoryChunks[i].documentId === documentId) {
      removedChunks.unshift(...memoryChunks.splice(i, 1));
    }
  }
  try {
    saveToDisk();
  } catch {
    if (existingDocument) memoryDocuments.set(documentId, existingDocument);
    memoryChunks.push(...removedChunks);
    throw new Error('Could not persist the document deletion to the local store.');
  }
  return true;
}

/**
 * Lists all stored documents.
 */
export async function listStoredDocuments(ownerUserId: string): Promise<StoredDocument[]> {
  const isPostgresReady = await initDb();
  if (isPostgresReady && pool) {
    try {
      const res = await pool.query(
        `SELECT id, owner_user_id, title, filename, size_bytes, page_count, suggested_questions, created_at
         FROM documents WHERE owner_user_id = $1 ORDER BY created_at DESC;`,
        [ownerUserId]
      );
      return res.rows.map(r => ({
        id: r.id,
        ownerUserId: r.owner_user_id,
        title: r.title,
        filename: r.filename,
        sizeBytes: r.size_bytes,
        pageCount: r.page_count,
        suggestedQuestions: Array.isArray(r.suggested_questions)
          ? r.suggested_questions
          : JSON.parse(r.suggested_questions || '[]'),
        createdAt: new Date(r.created_at),
      }));
    } catch {
      console.error('Document database listing failed.');
      throw new Error('Could not list documents from the configured database.');
    }
  }

  loadFromDisk();
  return Array.from(memoryDocuments.values()).filter(doc => doc.ownerUserId === ownerUserId);
}
