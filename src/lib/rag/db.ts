import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { DocumentChunk } from './chunker';

export interface StoredDocument {
  id: string;
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
  // eslint-disable-next-line no-var
  var __askguru_docs: Map<string, StoredDocument> | undefined;
  // eslint-disable-next-line no-var
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
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const data = {
      docs: Array.from(memoryDocuments.entries()),
      chunks: memoryChunks,
    };
    fs.writeFileSync(STORE_FILE, JSON.stringify(data));
  } catch (err) {
    // Ignore file write errors in read-only environments
  }
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
  } catch (err) {
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
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
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
  } catch (err) {
    console.warn('Postgres connection failed, falling back to local vector memory store:', err);
    return false;
  }
}

/**
 * Stores a document and its embedded chunks.
 */
export async function saveDocumentWithChunks(
  doc: StoredDocument,
  chunks: DocumentChunk[],
  embeddings: number[][]
): Promise<void> {
  const isPostgresReady = await initDb();

  if (isPostgresReady && pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO documents (id, title, filename, size_bytes, page_count, suggested_questions, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           suggested_questions = EXCLUDED.suggested_questions;`,
        [
          doc.id,
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
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Failed to save document in Postgres, saving to fallback:', err);
    } finally {
      client.release();
    }
  }

  // Fallback in-memory storage + disk persistence
  memoryDocuments.set(doc.id, doc);
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
  saveToDisk();
}

/**
 * Computes cosine similarity between two numeric vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Retrieves the top-K chunks for a document using vector cosine distance.
 */
export async function searchSimilarChunks(
  documentId: string,
  queryEmbedding: number[],
  topK = 4
): Promise<ScoredChunk[]> {
  const isPostgresReady = await initDb();

  if (isPostgresReady && pool) {
    try {
      const vectorStr = `[${queryEmbedding.join(',')}]`;
      const result = await pool.query(
        `SELECT id, document_id, page_number, chunk_index, chunk_text,
                (1 - (embedding <=> $1::vector)) as similarity
         FROM document_chunks
         WHERE document_id = $2
         ORDER BY embedding <=> $1::vector ASC
         LIMIT $3;`,
        [vectorStr, documentId, topK]
      );

      return result.rows.map(r => ({
        id: r.id,
        documentId: r.document_id,
        pageNumber: r.page_number,
        chunkIndex: r.chunk_index,
        text: r.chunk_text,
        similarity: parseFloat(r.similarity),
      }));
    } catch (err) {
      console.warn('Postgres search query failed, checking memory store:', err);
    }
  }

  // In-memory vector cosine similarity calculation
  loadFromDisk();
  const docChunks = memoryChunks.filter(c => c.documentId === documentId);

  // If there are few chunks, return all of them
  if (docChunks.length === 0) {
    return [];
  }

  const scored = docChunks.map(c => ({
    id: c.id,
    documentId: c.documentId,
    pageNumber: c.pageNumber,
    chunkIndex: c.chunkIndex,
    text: c.text,
    similarity: cosineSimilarity(queryEmbedding, c.embedding),
  }));

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topK);
}

/**
 * Deletes a stored document and its associated chunks.
 */
export async function deleteStoredDocument(documentId: string): Promise<void> {
  const isPostgresReady = await initDb();
  if (isPostgresReady && pool) {
    try {
      await pool.query('DELETE FROM documents WHERE id = $1', [documentId]);
    } catch (err) {
      console.warn('Failed to delete from Postgres:', err);
    }
  }

  memoryDocuments.delete(documentId);
  for (let i = memoryChunks.length - 1; i >= 0; i--) {
    if (memoryChunks[i].documentId === documentId) {
      memoryChunks.splice(i, 1);
    }
  }
  saveToDisk();
}

/**
 * Lists all stored documents.
 */
export async function listStoredDocuments(): Promise<StoredDocument[]> {
  const isPostgresReady = await initDb();
  if (isPostgresReady && pool) {
    try {
      const res = await pool.query(
        'SELECT id, title, filename, size_bytes, page_count, suggested_questions, created_at FROM documents ORDER BY created_at DESC;'
      );
      return res.rows.map(r => ({
        id: r.id,
        title: r.title,
        filename: r.filename,
        sizeBytes: r.size_bytes,
        pageCount: r.page_count,
        suggestedQuestions: Array.isArray(r.suggested_questions)
          ? r.suggested_questions
          : JSON.parse(r.suggested_questions || '[]'),
        createdAt: new Date(r.created_at),
      }));
    } catch (err) {
      console.warn('Postgres list query failed, using memory store:', err);
    }
  }

  loadFromDisk();
  return Array.from(memoryDocuments.values());
}
