import { NextResponse } from 'next/server';
import type { AuthenticatedUser } from '@/lib/auth';
import type { StoredDocument } from './db';

export interface DocumentApiDependencies {
  getUser(headers: Headers): Promise<AuthenticatedUser | null>;
  listDocuments(ownerUserId: string): Promise<StoredDocument[]>;
  deleteDocument(documentId: string, ownerUserId: string): Promise<boolean>;
}

export function createDocumentHandlers(dependencies: DocumentApiDependencies) {
  async function getUser(request: Request) {
    try {
      const user = await dependencies.getUser(request.headers);
      return user
        ? { user, response: null }
        : { user: null, response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
    } catch {
      return {
        user: null,
        response: NextResponse.json({ error: 'Authentication service is unavailable.' }, { status: 503 }),
      };
    }
  }

  async function GET(request: Request) {
    const auth = await getUser(request);
    if (auth.response) return auth.response;
    try {
      const stored = await dependencies.listDocuments(auth.user.id);
      const documents = stored.map(doc => ({
        id: doc.id,
        title: doc.title,
        filename: doc.filename,
        sizeBytes: doc.sizeBytes,
        pageCount: doc.pageCount,
        uploadedAt: new Date(doc.createdAt).toLocaleDateString(),
        suggestedQuestions: doc.suggestedQuestions || [],
        initialMessages: [],
      }));
      return NextResponse.json({ documents });
    } catch {
      return NextResponse.json({ error: 'Could not load documents.' }, { status: 503 });
    }
  }

  async function DELETE(request: Request) {
    const auth = await getUser(request);
    if (auth.response) return auth.response;
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Document id is required.' }, { status: 400 });
    try {
      const deleted = await dependencies.deleteDocument(id, auth.user.id);
      if (!deleted) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
      return NextResponse.json({ success: true, deletedId: id });
    } catch {
      return NextResponse.json({ error: 'Could not delete the document.' }, { status: 503 });
    }
  }

  return { GET, DELETE };
}
