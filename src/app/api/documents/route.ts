import { NextRequest, NextResponse } from 'next/server';
import { listStoredDocuments, deleteStoredDocument } from '@/lib/rag/db';
import { DocumentItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
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
  } catch (err: any) {
    return NextResponse.json({ documents: [] });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Document id is required.' }, { status: 400 });
    }

    await deleteStoredDocument(id);
    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to delete document' }, { status: 500 });
  }
}
