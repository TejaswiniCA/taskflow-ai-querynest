import { NextRequest, NextResponse } from 'next/server';
import { listStoredDocuments, deleteStoredDocument } from '@/lib/rag/db';
import { DocumentItem } from '@/lib/types';
import { requireAuthenticatedRequest } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAuthenticatedRequest(req.headers);
  if (auth.response) return auth.response;
  try {
    const stored = await listStoredDocuments();
    const clientDocs: DocumentItem[] = stored.map(doc => ({
      id: doc.id,
      title: doc.title,
      filename: doc.filename,
      sizeBytes: doc.sizeBytes,
      pageCount: doc.pageCount,
      uploadedAt: new Date(doc.createdAt).toLocaleDateString(),
      suggestedQuestions: doc.suggestedQuestions || [],
      initialMessages: [],
    }));

    return NextResponse.json({ documents: clientDocs });
  } catch {
    return NextResponse.json({ error: 'Could not load documents.' }, { status: 503 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuthenticatedRequest(req.headers);
  if (auth.response) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Document id is required.' }, { status: 400 });
    }

    await deleteStoredDocument(id);
    return NextResponse.json({ success: true, deletedId: id });
  } catch {
    return NextResponse.json({ error: 'Could not delete the document.' }, { status: 503 });
  }
}
