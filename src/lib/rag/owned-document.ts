export type OwnedDocumentQuery = (
  sql: string,
  values: unknown[]
) => Promise<{ rows: Array<{ id: string }> }>;

export async function documentBelongsToUser(
  query: OwnedDocumentQuery,
  documentId: string,
  ownerUserId: string
): Promise<boolean> {
  const result = await query(
    'SELECT id FROM documents WHERE id = $1 AND owner_user_id = $2 LIMIT 1',
    [documentId, ownerUserId]
  );
  return result.rows.length > 0;
}

export interface OwnedChunkRow {
  id: string;
  document_id: string;
  page_number: number;
  chunk_index: number;
  chunk_text: string;
  similarity: number | string;
}

export type OwnedChunkQuery = (
  sql: string,
  values: unknown[]
) => Promise<{ rows: OwnedChunkRow[] }>;

export async function retrieveOwnedChunks(
  query: OwnedChunkQuery,
  documentId: string,
  ownerUserId: string,
  vectorString: string,
  topK: number
): Promise<OwnedChunkRow[]> {
  const result = await query(
    `SELECT c.id, c.document_id, c.page_number, c.chunk_index, c.chunk_text,
            (1 - (c.embedding <=> $1::vector)) as similarity
     FROM document_chunks c
     INNER JOIN documents d ON d.id = c.document_id
     WHERE d.id = $2 AND d.owner_user_id = $3
     ORDER BY c.embedding <=> $1::vector ASC
     LIMIT $4;`,
    [vectorString, documentId, ownerUserId, topK]
  );
  return result.rows;
}
