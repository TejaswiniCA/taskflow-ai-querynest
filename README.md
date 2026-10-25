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
        J --> K["Strict System Prompt (Zero Hallucination)"]
        K --> L["Gemini Flash (gemini-2.5-flash)"]
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
5. **Database Indexing**: Documents and chunk vectors are persisted into PostgreSQL using the `pgvector` extension with HNSW cosine distance indexing (`<=>`). An in-memory/file fallback engine runs automatically if a remote database is not connected.
6. **Cosine Similarity Search**: When a question is received, the query is embedded and compared against the document's stored chunks, selecting the top 4 most relevant excerpts.
7. **Strict Grounding Mandate**: Chunks are injected into a zero-hallucination system prompt. If the question cannot be answered from the retrieved text, the model returns:
   > *"I couldn't find that in your documents."*
8. **Inspectable Citations**: Retrieved passages populate clickable citation chips (`Page 4`) that slide open the Source Inspector Drawer showing the exact verbatim passage.

---

## ⚡ Setup & Local Run

### Prerequisites
- Node.js 22+ (the current lockfile includes a dependency requiring Node 22)
- PostgreSQL for TaskFlow task persistence
- Google Gemini API key ([Google AI Studio](https://aistudio.google.com/)) to use document upload and AI chat

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

# PostgreSQL connection used by TaskFlow; QueryNest also uses it when available
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Better Auth (generate a unique secret with: openssl rand -base64 32)
BETTER_AUTH_SECRET=replace_with_a_random_secret_of_at_least_32_characters
BETTER_AUTH_URL=http://localhost:3000

# Local interview demo without OAuth; only active with NODE_ENV=development
TASKFLOW_LOCAL_AUTH=true

# Google OAuth web client credentials; these are separate from Gemini API keys
TASKFLOW_GOOGLE_CLIENT_ID=your_google_oauth_client_id
TASKFLOW_GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
TASKFLOW_ALLOWED_EMAIL=you@example.com
```

For local interview development, keep `TASKFLOW_LOCAL_AUTH=true` in `.env.local` and use `npm run dev`. The development server binds to `127.0.0.1`; the local identity always uses `local-development-user` and can see the existing task with that owner. This is a single-user shortcut, not authentication. Do not expose the server to your network or deploy with this setting.

### Optional Google OAuth setup

Create an OAuth client in Google Cloud Console under **APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application**. Add the app's local origin under **Authorized JavaScript origins** and add this exact redirect URI under **Authorized redirect URIs**:

```text
http://localhost:3000/api/auth/callback/google
```

Use the same port in `BETTER_AUTH_URL`; if Next.js selects another port, update both values and the Google Console URI to match. Add the allowed Google account as a test user in the OAuth consent screen while the consent app is in testing mode. Store the OAuth client ID and secret only in `.env.local`.

For Google OAuth, set `TASKFLOW_LOCAL_AUTH=false` and configure the Better Auth environment variables. The local identity is ignored outside `NODE_ENV=development`.

The Better Auth SQL in `db/migrations/002_better_auth.sql` is unapplied and requires review before use. It creates auth tables and adds an unvalidated foreign key; it does not reassign the development-owned task. Do not treat this file as an applied schema change.

### 3. Check a local build
```bash
# Compile the app; a successful build does not mean it is safe to deploy
npm run build
```
Run the development server with `npm run dev` and open [http://127.0.0.1:3000](http://127.0.0.1:3000).

---

## 🧪 Testing & Evaluation

### Chunker Unit Tests
```bash
npm run test:unit
```
Verifies token estimation, boundary splitting, overlap continuity, multi-page assignment, and empty page pruning.

### 10-Question RAG Benchmark
```bash
npm run evaluate
```
Executes 10 ground-truth verification queries against a sample 15-page machine learning paper (*Attention Is All You Need*), asserting top-4 page retrieval accuracy.

### Playwright End-to-End Tests
```bash
npm run test:e2e
```
The QueryNest Playwright tests use `docs/sample_document.pdf`, parse and chunk it with the project code, and intercept every browser `/api/*` request with per-test in-memory fixtures. They do not call Gemini, the PostgreSQL document store, or the real upload/chat API handlers. This verifies the UI request/response flow, not live vector retrieval or model grounding.

The suite validates unsupported-file feedback, sample PDF upload UI, streamed answer/citation rendering, and rendering of the fallback response supplied by the isolated chat fixture.

---

## Deployment status: not ready for public use

This repository currently describes a local interview demo. QueryNest upload, document listing, and chat endpoints are unauthenticated and do not enforce per-user document ownership. The local development identity is not authentication, and the Better Auth migration remains unapplied. Do not deploy this app publicly or use it for private documents until these gaps and the production configuration have been addressed and reviewed.

---

## ⚠️ Known Limitations

- **Image-Only PDFs**: Scanned documents without an OCR text layer cannot have text extracted. (Requires OCR pre-processing).
- **Complex Multi-Column Tables**: Extreme multi-column tabular data in raw PDFs may occasionally interleave column text.
- **Maximum File Size**: Current upload ceiling is 5 MB per document to prevent serverless function memory exhaustion.

---

<sub>QueryNest is an independent learning project for grounded document question answering.</sub>
