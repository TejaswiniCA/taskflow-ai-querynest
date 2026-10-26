# TaskFlow AI + QueryNest

> **Ask your documents. Get answers with proof.**

TaskFlow AI + QueryNest is a local interview demo combining PostgreSQL-backed task management with document question answering. QueryNest ingests PDFs and text files, creates Gemini vector embeddings, and returns grounded answers with page-level citations.

> **Local-only security status:** TaskFlow can use an opt-in local development identity that maps to `local-development-user`; it is a development shortcut, not authentication. Better Auth requires its own configuration and reviewed database migration. QueryNest document upload, listing, and chat APIs remain unauthenticated and are not scoped to users. Keep the app bound to localhost. Do not deploy it publicly or treat it as production-ready until authentication and authorization protect all APIs and stored data, and the deployment configuration has been reviewed. The existing development task is preserved.

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

This is a local interview/demo application, not a production deployment. The TaskFlow local identity is a development shortcut. QueryNest has a single shared document store without per-document owner columns, even though its UI and API routes now require the configured session. Keep the app on loopback and use only data you are comfortable storing in a local demo. Do not expose it to a network or deploy it publicly.

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

# Better Auth (generate a unique secret with: openssl rand -base64 32)
BETTER_AUTH_SECRET=replace_with_a_random_secret_of_at_least_32_characters
BETTER_AUTH_URL=http://localhost:3000

# Local-only identity; active only with NODE_ENV=development and loopback host
TASKFLOW_LOCAL_AUTH=true

# Google OAuth web client credentials; these are separate from Gemini API keys
TASKFLOW_GOOGLE_CLIENT_ID=your_google_oauth_client_id
TASKFLOW_GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
TASKFLOW_ALLOWED_EMAIL=you@example.com
```

For local interview development, keep `TASKFLOW_LOCAL_AUTH=true` in `.env.local` and use `npm run dev`. The development server binds to `127.0.0.1`; the local identity always uses `local-development-user` and can see the existing task with that owner. This is a single-user shortcut, not authentication. Do not expose the server to your network or deploy with this setting. QueryNest documents are not individually tied to an account in the current schema.

### Optional Google OAuth setup

Create an OAuth client in Google Cloud Console under **APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application**. Add the app's local origin under **Authorized JavaScript origins** and add this exact redirect URI under **Authorized redirect URIs**:

```text
http://localhost:3000/api/auth/callback/google
```

Use the same port in `BETTER_AUTH_URL`; if Next.js selects another port, update both values and the Google Console URI to match. Add the allowed Google account as a test user in the OAuth consent screen while the consent app is in testing mode. Store the OAuth client ID and secret only in `.env.local`.

For Google OAuth, set `TASKFLOW_LOCAL_AUTH=false` and configure the Better Auth environment variables. The local identity is ignored outside `NODE_ENV=development`.

The Better Auth SQL in `db/migrations/002_better_auth.sql` is unapplied and requires review before use. It creates auth tables and adds an unvalidated foreign key; it does not reassign the development-owned task. Do not treat this file as an applied schema change.

### Database notes

The task table is defined in `db/migrations/001_create_tasks.sql`. The Better Auth schema and foreign key are in `db/migrations/002_better_auth.sql`; that file is unapplied and requires review before use. Do not apply either migration automatically. QueryNest's current `initDb()` also runs additive `CREATE EXTENSION/TABLE/INDEX IF NOT EXISTS` statements when its PostgreSQL path is first accessed; the application database role therefore needs those privileges. Review and move that DDL into a controlled, reviewed migration before relying on a hosted database. No migration has been run as part of this work.

For a new local database, first review `db/migrations/001_create_tasks.sql`, then apply only that additive task migration yourself with `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/001_create_tasks.sql`. Verify it with `psql "$DATABASE_URL" -c '\d public.tasks'`. Do not apply migration `002` until its auth tables, existing local task behavior, and foreign-key effects have been reviewed. In particular, that foreign key would reject future tasks owned by `local-development-user` unless an explicitly designed auth identity row is provided; the existing development task remains untouched.

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
The unit suite covers task validation/API ownership, auth policy, chunking, file validation, sample PDF extraction, unique IDs for repeated document uploads, and in-memory vector ranking. The tests use fake task handlers and the local sample file; they do not connect to PostgreSQL or call Gemini.

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

## Deployment status: not ready for public use

This repository currently describes a local interview demo. The local development identity is not authentication. QueryNest's endpoints require the configured session, but the document/vector schema is still globally shared and has no per-user ownership. The Better Auth migration remains unapplied. Do not deploy this app publicly or use it for private documents until the schema enforces ownership, the migration is reviewed and applied deliberately, and production auth, storage, rate limiting, and deployment settings are independently reviewed.

---

## ⚠️ Known Limitations

- **Image-Only PDFs**: Scanned documents without an OCR text layer cannot have text extracted. (Requires OCR pre-processing).
- **Complex Multi-Column Tables**: Extreme multi-column tabular data in raw PDFs may occasionally interleave column text.
- **Maximum File Size**: Current upload ceiling is 5 MB per document to prevent serverless function memory exhaustion.

---

<sub>TaskFlow AI + QueryNest is a local learning project for task organization and document question answering.</sub>
