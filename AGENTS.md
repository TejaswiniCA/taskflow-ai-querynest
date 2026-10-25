# AGENTS.md — QueryNest Guidelines & Project Rules

## 1. Project Overview & Identity
- **Application**: **QueryNest** (folder: `askguru-docs`)
- **Tagline**: *"Ask your documents. Get answers with proof."*
- **Description**: Production-grade RAG web app providing grounded document Q&A with verifiable page-level citation chips.
- **Identity**: QueryNest is an independent learning project for grounded document question answering.

## 2. Core Architecture & Tech Stack
- **Framework**: Next.js 14 App Router + TypeScript (strict mode)
- **Styling**: Tailwind CSS with unified design tokens (Indigo accent `hsl(239 84% 67%)`), dark theme default (persisted via `next-themes`), 8px spacing scale, 16px body text, 1.6 line height.
- **AI & Models**: Google Gemini API via `@google/generative-ai` and Vercel AI SDK patterns:
  - Chat: `gemini-2.5-flash`
  - Embeddings: `gemini-embedding-001` (3072 dimensions)
- **Database**: PostgreSQL with `pgvector` (Neon / Supabase), with built-in zero-config local vector store fallback.
- **Document Ingestion**: `pdf-parse` (page-by-page extraction) + overlapping chunker (~800 tokens, 100 overlap).

## 3. Strict Grounding Mandate
- The model must answer **ONLY** from retrieved context chunks.
- If information is absent or insufficient, it must return:
  `"I couldn't find that in your documents."`
- Never output conversational filler, disclaimers, apologies, or unverified claims.
- Every derived statement must map back to an extracted source passage and page number.

## 4. Security & Safety Rules
- Zero API keys or secrets in source code or git commits. Strictly use `.env.local` (git-ignored) and `.env.example`.
- Enforce a 5 MB maximum upload ceiling and sanitize filenames against directory traversals.
- Apply sliding-window rate limiting on all public API endpoints.

## 5. Testing & Verification Rules
- **Unit Tests**: Test chunking boundary preservation, token estimation, and overlap with `npm run test:unit`.
- **Retrieval Benchmark**: Test top-4 retrieval accuracy on 10 ground-truth questions with `npm run evaluate`.
- **E2E Tests**: Playwright scenarios in `e2e/rag.spec.ts` covering citations, out-of-context fallback, and invalid file uploads.
