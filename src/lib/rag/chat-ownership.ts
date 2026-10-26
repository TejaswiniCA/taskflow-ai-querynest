import { NextResponse } from 'next/server';

export type OwnsDocument = (documentId: string, ownerUserId: string) => Promise<boolean>;

export function createChatOwnershipGuard(ownsDocument: OwnsDocument) {
  return async (documentId: string, ownerUserId: string): Promise<NextResponse | null> => {
    if (await ownsDocument(documentId, ownerUserId)) return null;
    return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
  };
}
