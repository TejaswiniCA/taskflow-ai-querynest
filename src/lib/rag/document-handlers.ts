import { NextResponse } from 'next/server';
import type { StoredDocument } from './db';

export interface DocumentApiDependencies {
  ownerUserId: string;
  listDocuments(ownerUserId: string): Promise<StoredDocument[]>;
  deleteDocument(documentId: string, ownerUserId: string): Promise<boolean>;
}

export function createDocumentHandlers(dependencies: DocumentApiDependencies) {
  async function GET(request: Request) {
    void request;
    try {
      const stored = await dependencies.listDocuments(dependencies.ownerUserId);
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
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Document id is required.' }, { status: 400 });
    try {
      const deleted = await dependencies.deleteDocument(id, dependencies.ownerUserId);
      if (!deleted) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
      return NextResponse.json({ success: true, deletedId: id });
    } catch {
      return NextResponse.json({ error: 'Could not delete the document.' }, { status: 503 });
    }
  }

  return { GET, DELETE };
}
