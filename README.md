# TaskFlow AI + QueryNest

> **Ask your documents. Get answers with proof.**

TaskFlow AI + QueryNest is a local interview demo combining PostgreSQL-backed task management with document question answering. QueryNest ingests PDFs and text files, creates Gemini vector embeddings, and returns grounded answers with page-level citations.

> **Shared demo warning:** There is no sign-in or authentication. All visitors share access to demo tasks and documents and may create, change, or delete them. Do not upload private, personal, or sensitive information. This app is not a private workspace or a production-ready service.

---

## 🏗️ Architecture

```mermaid
flowchart TD
    subgraph Ingestion["Document Ingestion Pipeline"]
        A["Uploaded PDF / TXT (max 5 MB)"] --> B["File Validation & Sanitization"]
        B --> C["Per-Page Text Extractor (pdf-parse)"]
        C --> D["Overlapping Chunker (~800 tokens, 100 overlap)"]
        D --> E["Gemini Embedder (gemini-embedding-001)"]
        E --> F[("PostgreSQL with pgvector (vector 3072)")]
    end

    subgraph Query["Query & Retrieval Pipeline"]
        G["User Question"] --> H["Query Embedding"]
        H --> I["Cosine Similarity Search (<=> operator)"]
        F --> I
        I --> J["Top-4 Grounded Chunks + Metadata"]
        J --> K["Grounded prompt with untrusted source data"]
        K --> L["Gemini model fallback list"]
        L --> M["Streaming NDJSON Stream"]
    end

    subgraph Interface["UI & Source Inspector"]
        M --> N["Chat Panel with Token Streaming"]
        N --> O["Interactive Citation Chips (Page #)"]
        O --> P["Source Passage Inspector Drawer"]
    end
```

---

## 🧠 How Retrieval Works

1. **Upload & Sanitization**: Documents are uploaded via `/api/upload` (enforcing a 5 MB maximum size limit). Filenames are sanitized to prevent directory traversal and null-byte injection.
2. **Page-Aware Extraction**: Text is extracted page-by-page to retain accurate source page metadata.
3. **Sliding-Window Chunking**: Chunks are generated with an ~800 token target (approx 3,200 characters) and a 100 token overlap (approx 400 characters), splitting strictly on sentence and paragraph boundaries to maintain semantic continuity.
4. **Vector Embeddings**: Each chunk is embedded into a 3072-dimensional vector via Gemini's `gemini-embedding-001`.
5. **Database Indexing**: Documents and chunk vectors are stored in PostgreSQL with `pgvector`; current runtime initialization creates the extension/tables and a document ID index. There is no HNSW index. If `DATABASE_URL` is absent, local development can use an in-memory store with a `.data/local_store.json` file fallback. If a configured PostgreSQL database fails, the app reports an error instead of pretending the write succeeded in another store.
6. **Cosine Similarity Search**: When a question is received, the query is embedded and compared against the document's stored chunks, selecting the top 4 most relevant excerpts.
7. **Grounded Answers**: Retrieved chunks are marked as untrusted source data in the prompt. A missing retrieval returns this deterministic response without calling Gemini:
   > *"I couldn't find that in your documents."*
   For retrieved passages, the model can still make mistakes; citations show the retrieved excerpts but do not prove every generated claim.
8. **Inspectable Citations**: Retrieved passages populate clickable citation chips (`Page 4`) that slide open the Source Inspector Drawer showing the exact verbatim passage.

---

## Local development setup

### Prerequisites
- Node.js 22+ (the current lockfile includes a dependency requiring Node 22)
- PostgreSQL for TaskFlow task persistence
- Google Gemini API key ([Google AI Studio](https://aistudio.google.com/)) to use document upload and AI chat

This is an unauthenticated shared demo. Every visitor operates on the same demo namespace (`local-development-user`) for tasks and documents. The owner value is only a database partition key; it does not identify or authenticate a visitor. Anyone who can reach the app can view, create, edit, and delete the tasks and documents in that namespace. Do not enter private or sensitive data. Public access also exposes the Gemini-backed endpoints to abuse and unexpected API costs. Keep local development bound to loopback. Before any public demo, use a separate disposable database with no personal data and add deployment-wide quotas and abuse controls; this project does not provide strong public-demo protections.

### 1. Installation
```bash
git clone https://github.com/your-org/askguru-docs.git
cd askguru-docs
npm install
```

### 2. Environment Variables
Create `.env.local`:
```bash
cp .env.example .env.local
```
Populate `.env.local`:
```env
# Google Gemini API Key
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here

# PostgreSQL connection used by task and document storage.
# For hosted PostgreSQL use certificate verification (sslmode=verify-full).
# For local PostgreSQL use a loopback URL and omit sslmode, or use sslmode=disable.
DATABASE_URL=postgresql://user:password@127.0.0.1:5432/taskflow_ai

```

Only `DATABASE_URL` is needed for PostgreSQL-backed task/document storage. `GOOGLE_GENERATIVE_AI_API_KEY` is needed for document embeddings and AI answers. No authentication variables or Google OAuth setup are used.

### Database notes

The task table is defined in `db/migrations/001_create_tasks.sql`. The older Better Auth migration `db/migrations/002_better_auth.sql` remains in the repository as historical schema work but is no longer required by this app; do not apply it for this demo. No migration is run automatically by this sign-in change. QueryNest's current `initDb()` also runs additive `CREATE EXTENSION/TABLE/INDEX IF NOT EXISTS` statements when its PostgreSQL path is first accessed; the application database role therefore needs those privileges. Review and move that DDL into a controlled, reviewed migration before relying on a hosted database.

For a new local database, first review `db/migrations/001_create_tasks.sql`, then apply only that additive task migration yourself with `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/001_create_tasks.sql`. Verify it with `psql "$DATABASE_URL" -c '\d public.tasks'`. Do not apply the obsolete Better Auth migration `002` for this unauthenticated demo.

### 3. Check a local build
```bash
# Compile the app; a successful build does not mean it is safe to deploy
npm run build
```
Run the development server with `npm run dev` and open [http://127.0.0.1:3000](http://127.0.0.1:3000).

---

## 🧪 Testing & Evaluation

### Unit tests, type check, and lint
```bash
npm test
npm run test:unit
npx tsc --noEmit
npm run lint
npm run build
```
The unit suite covers task validation and shared demo namespace scoping, document namespace scoping, chunking, file validation, sample PDF extraction, unique IDs for repeated document uploads, and in-memory vector ranking. Tests use fake handlers and local fixtures; they do not connect to PostgreSQL or call Gemini.

### Optional 10-question RAG benchmark
```bash
npm run evaluate
```
Uses Gemini embeddings and the included sample PDF. It should run entirely in memory and must not write to your configured PostgreSQL database. It requires a valid Gemini API key and makes external AI requests.

### Playwright End-to-End Tests
```bash
npm run test:e2e
```
If Playwright reports that its Chromium executable is missing, install the test browser with `npx playwright install chromium`.
The Playwright tests use `docs/sample_document.pdf` for QueryNest and in-memory fixture handlers for TaskFlow. They intercept every browser `/api/*` request. They do not call Gemini, PostgreSQL, or the real upload/chat/task API handlers. This verifies UI request/response flows, not live vector retrieval or model grounding.

The suite validates unsupported-file feedback, sample PDF upload UI, streamed answer/citation rendering, the isolated not-found response, and a task create/complete/edit/filter/delete flow.

---

## Public demo limitations

There is no identity boundary: public visitors share the demo owner namespace. They can change or remove shared tasks and documents, and can trigger Gemini API usage. Existing upload/chat rate limits are process-local and do not provide distributed or deployment-wide protection; task APIs do not have rate limits. Vercel deployments also need persistent PostgreSQL and a separate, disposable demo database. Do not deploy this as a private-data application. OAuth and sign-in are intentionally not part of this project version.

---

## ⚠️ Known Limitations

- **Image-Only PDFs**: Scanned documents without an OCR text layer cannot have text extracted. (Requires OCR pre-processing).
- **Complex Multi-Column Tables**: Extreme multi-column tabular data in raw PDFs may occasionally interleave column text.
- **Maximum File Size**: Current upload ceiling is 5 MB per document to prevent serverless function memory exhaustion.

---

<sub>TaskFlow AI + QueryNest is a local learning project for task organization and document question answering.</sub>
