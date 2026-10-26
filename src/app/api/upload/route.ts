import { NextRequest, NextResponse } from 'next/server';
import { validateAndSanitizeFile } from '@/lib/rag/sanitizer';
import { extractTextPerPage } from '@/lib/rag/extractor';
import { chunkPages, namespaceChunks } from '@/lib/rag/chunker';
import { embedBatch } from '@/lib/rag/embedder';
import { saveDocumentWithChunks } from '@/lib/rag/db';
import { generateSuggestedQuestions } from '@/lib/rag/suggester';
import { checkRateLimit } from '@/lib/rag/rate-limiter';
import { DocumentItem } from '@/lib/types';
import { randomUUID } from 'node:crypto';
import { requireAuthenticatedRequest } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max execution

export async function POST(req: NextRequest) {
  const auth = await requireAuthenticatedRequest(req.headers);
  if (auth.response) return auth.response;
  const contentLength = Number(req.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > 5 * 1024 * 1024 + 64 * 1024) {
    return NextResponse.json({ error: 'Upload exceeds the maximum size of 5 MB.' }, { status: 413 });
  }
  // Rate-limiting check
  const ip = (req.headers.get('x-forwarded-for') || '127.0.0.1').split(',')[0].trim().slice(0, 80);
  const rateLimit = checkRateLimit(ip, 20, 60000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Too many upload requests. Please wait ${Math.ceil(rateLimit.resetMs / 1000)} seconds.` },
      { status: 429 }
    );
  }

  try {
    const formData = await req.formData();
    const entry = formData.get('file');
    const file = entry && typeof entry !== 'string' && typeof entry.arrayBuffer === 'function' ? entry : null;

    if (!file) {
      return NextResponse.json(
        { error: 'No document file provided in request.' },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File exceeds the maximum size of 5 MB.' }, { status: 413 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Validate & sanitize
    const validated = validateAndSanitizeFile(file, buffer);

    // 2. Extract page-by-page text
    const extractedPages = await extractTextPerPage(validated.buffer, validated.fileType);

    if (extractedPages.length === 0 || extractedPages.every(p => p.text.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Could not extract text from document. Ensure it contains readable text and is not an image-only scan.' },
        { status: 422 }
      );
    }

    // 3. Chunk into overlapping ~800 token windows
    const docId = `doc-${randomUUID()}`;
    const chunks = namespaceChunks(docId, chunkPages(extractedPages, {
      targetTokens: 800,
      overlapTokens: 100,
    }));
    const cleanTitle = validated.fileName
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]/g, ' ')
      .trim();

    // 4. Generate Gemini embeddings for all chunks
    const chunkTexts = chunks.map(c => c.text);
    const embeddings = await embedBatch(chunkTexts);

    // 5. Generate 4 document-tailored suggested questions
    const sampleText = extractedPages.slice(0, 3).map(p => p.text).join('\n');
    const suggestedQuestions = await generateSuggestedQuestions(cleanTitle, sampleText);

    // 6. Save document & vector embeddings into Postgres / vector store
    const storedDoc = {
      id: docId,
      ownerUserId: auth.user.id,
      title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
      filename: validated.fileName,
      sizeBytes: validated.sizeBytes,
      pageCount: extractedPages.length,
      suggestedQuestions,
      createdAt: new Date(),
    };

    await saveDocumentWithChunks(storedDoc, chunks, embeddings, auth.user.id);

    const clientDocument: DocumentItem = {
      id: storedDoc.id,
      title: storedDoc.title,
      filename: storedDoc.filename,
      sizeBytes: storedDoc.sizeBytes,
      pageCount: storedDoc.pageCount,
      uploadedAt: 'Just now',
      suggestedQuestions: storedDoc.suggestedQuestions,
      initialMessages: [],
    };

    return NextResponse.json({
      success: true,
      document: clientDocument,
      chunksCount: chunks.length,
    });
  } catch (err: unknown) {
    console.error('Upload processing failed.');
    const message = err instanceof Error ? err.message : '';
    const status = message.startsWith('Unsupported file type') ? 415
      : /File size|File exceeds|Upload exceeds/.test(message) ? 413
      : /malformed|empty|valid UTF-8|Failed to parse PDF|Could not extract/i.test(message) ? 422
      : /database|local store/i.test(message) ? 503
      : 502;
    return NextResponse.json(
      {
        error: /^(Unsupported file type|File size|File exceeds|Upload exceeds|The PDF file|The text document|Failed to parse PDF|Could not extract)/.test(message)
          ? message
          : 'Could not process this document. Check the file and AI configuration, then try again.',
      },
      { status }
    );
  }
}
