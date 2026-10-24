import { NextResponse } from 'next/server';
import { listStoredDocuments } from '@/lib/rag/db';
import { DocumentItem } from '@/lib/types';
import { MOCK_DOCUMENTS } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stored = await listStoredDocuments();
    if (stored.length === 0) {
      // Return initial defaults
      return NextResponse.json({ documents: MOCK_DOCUMENTS });
    }

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
    return NextResponse.json({ documents: MOCK_DOCUMENTS });
  }
}
