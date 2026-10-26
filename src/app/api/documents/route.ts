import { getAuthenticatedUser } from '@/lib/auth';
import { createDocumentHandlers } from '@/lib/rag/document-handlers';
import { deleteStoredDocument, listStoredDocuments } from '@/lib/rag/db';

export const dynamic = 'force-dynamic';

const handlers = createDocumentHandlers({
  getUser: getAuthenticatedUser,
  listDocuments: listStoredDocuments,
  deleteDocument: deleteStoredDocument,
});

export async function GET(request: Request) {
  return handlers.GET(request);
}

export async function DELETE(request: Request) {
  return handlers.DELETE(request);
}
