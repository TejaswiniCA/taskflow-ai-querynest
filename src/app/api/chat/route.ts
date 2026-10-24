import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';
import { embedText } from '@/lib/rag/embedder';
import { searchSimilarChunks } from '@/lib/rag/db';
import { checkRateLimit } from '@/lib/rag/rate-limiter';
import { Citation } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function getApiKey(): string {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ''
  );
}

export async function POST(req: NextRequest) {
  // 1. Rate-limiting check
  const ip = req.headers.get('x-forwarded-for') || req.ip || '127.0.0.1';
  const rateLimit = checkRateLimit(ip, 30, 60000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Too many chat requests. Please wait ${Math.ceil(rateLimit.resetMs / 1000)} seconds.` },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { documentId, question, chatHistory = '' } = body;

    if (!question || !question.trim()) {
      return NextResponse.json({ error: 'Question is required.' }, { status: 400 });
    }

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required.' }, { status: 400 });
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Gemini API key is missing. Please check your configuration.' },
        { status: 500 }
      );
    }

    // 2. Embed the question
    const queryEmbedding = await embedText(question, TaskType.RETRIEVAL_QUERY);

    // 3. Retrieve top-4 chunks from vector store
    const retrievedChunks = await searchSimilarChunks(documentId, queryEmbedding, 4);

    const citations: Citation[] = retrievedChunks.map((chunk, idx) => ({
      id: `cit-${idx + 1}-${chunk.pageNumber}`,
      pageNumber: chunk.pageNumber,
      snippet: chunk.text.slice(0, 320) + (chunk.text.length > 320 ? '...' : ''),
      score: Math.min(1, Math.max(0, parseFloat(chunk.similarity.toFixed(2)))),
      sectionTitle: `Page ${chunk.pageNumber} Passage`,
    }));

    // Format context block
    const contextText = retrievedChunks
      .map(
        c =>
          `[PAGE ${c.pageNumber}]:\n${c.text}`
      )
      .join('\n\n---\n\n');

    const systemPrompt = `You are AskGuru, a precise document interrogation assistant.
Answer the user's question based ONLY on the provided context passages below.
Be concise and direct.
Do not include conversational filler, apologies, meta-commentary, or stray quote characters.
If the answer cannot be found in the provided context, respond EXACTLY with:
"I couldn't find that in your documents."

CONTEXT PASSAGES:
${contextText}

${chatHistory ? `RECENT CONVERSATION:\n${chatHistory}\n` : ''}
QUESTION:
${question}

ANSWER:`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.1,
      },
    });

    const streamResult = await model.generateContentStream(systemPrompt);

    // Stream as NDJSON lines for reliable client consumption
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        // First emit citation metadata
        const metadataEvent = JSON.stringify({ type: 'citations', citations }) + '\n';
        controller.enqueue(encoder.encode(metadataEvent));

        try {
          for await (const chunk of streamResult.stream) {
            const text = chunk.text();
            if (text) {
              const textEvent = JSON.stringify({ type: 'delta', text }) + '\n';
              controller.enqueue(encoder.encode(textEvent));
            }
          }
          const doneEvent = JSON.stringify({ type: 'done' }) + '\n';
          controller.enqueue(encoder.encode(doneEvent));
        } catch (streamErr) {
          console.error('Error during streaming:', streamErr);
          const errorEvent =
            JSON.stringify({
              type: 'error',
              error: 'Streaming interrupted. Please try again.',
            }) + '\n';
          controller.enqueue(encoder.encode(errorEvent));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('Chat API Error:', err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          'Failed to answer question. Ensure your Gemini API credentials are valid and try again.',
      },
      { status: 500 }
    );
  }
}
