import { NextRequest, NextResponse } from 'next/server';
import { validateAndSanitizeFile } from '@/lib/rag/sanitizer';
import { extractTextPerPage } from '@/lib/rag/extractor';
import { chunkPages } from '@/lib/rag/chunker';
import { embedBatch } from '@/lib/rag/embedder';
import { saveDocumentWithChunks } from '@/lib/rag/db';
import { generateSuggestedQuestions } from '@/lib/rag/suggester';
import { checkRateLimit } from '@/lib/rag/rate-limiter';
import { DocumentItem } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max execution

export async function POST(req: NextRequest) {
  // Rate-limiting check
  const ip = req.headers.get('x-forwarded-for') || req.ip || '127.0.0.1';
  const rateLimit = checkRateLimit(ip, 20, 60000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Too many upload requests. Please wait ${Math.ceil(rateLimit.resetMs / 1000)} seconds.` },
      { status: 429 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No document file provided in request.' },
        { status: 400 }
      );
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
    const chunks = chunkPages(extractedPages, {
      targetTokens: 800,
      overlapTokens: 100,
    });

    const docId = `doc-${Date.now()}`;
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
      title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
      filename: validated.fileName,
      sizeBytes: validated.sizeBytes,
      pageCount: extractedPages.length,
      suggestedQuestions,
      createdAt: new Date(),
    };

    await saveDocumentWithChunks(storedDoc, chunks, embeddings);

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
      chunks: chunks.map(c => ({
        id: c.id,
        pageNumber: c.pageNumber,
        chunkIndex: c.chunkIndex,
        text: c.text,
      })),
    });
  } catch (err: any) {
    console.error('Upload processing error:', err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          'An unexpected error occurred while processing your document. Please verify your file format and API keys.',
      },
      { status: 500 }
    );
  }
}
