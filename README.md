# AskGuru

> **Ask your documents. Get answers with proof.**

AskGuru is a production-grade, verifiable RAG (Retrieval-Augmented Generation) document intelligence platform. It ingests complex PDFs and text files, slices them into overlapping token windows, indexes them with 3072-dimensional Gemini vector embeddings into PostgreSQL with `pgvector`, and produces strictly grounded responses with clickable citation chips linked directly to the original page excerpt.

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
- Node.js 18+ (tested on Node v22)
- Google Gemini API Key ([Google AI Studio](https://aistudio.google.com/))
- (Optional) PostgreSQL with `pgvector` URL (e.g. Neon, Supabase)

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

# PostgreSQL with pgvector (leave blank to use the built-in local vector fallback)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

### 3. Run Production Build
```bash
# Compile optimized production bundle
npm run build

# Start production server
npm run start
```
Access the application at [http://localhost:3000](http://localhost:3000).

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
Validates:
- (a) Document exploration, question interrogation, and citation chip mounting.
- (b) Off-topic questions producing the strict fallback message.
- (c) Invalid file format rejection with user-friendly error banners.

---

## 🚀 Vercel Deployment Checklist

1. **Repository**: Push the codebase to GitHub / GitLab.
2. **Import Project**: In the [Vercel Dashboard](https://vercel.com/new), select the repository and use framework preset **Next.js**.
3. **Environment Variables**:
   - `GOOGLE_GENERATIVE_AI_API_KEY`: Your Gemini API key.
   - `DATABASE_URL`: Your Neon or Supabase serverless PostgreSQL connection string (including `sslmode=require`).
4. **Build Command**: `next build` (default).
5. **Output Directory**: `.next` (default).
6. **Deploy**: Trigger deployment. Vercel automatically runs the build and hosts the serverless API routes with edge caching.

---

## ⚠️ Known Limitations

- **Image-Only PDFs**: Scanned documents without an OCR text layer cannot have text extracted. (Requires OCR pre-processing).
- **Complex Multi-Column Tables**: Extreme multi-column tabular data in raw PDFs may occasionally interleave column text.
- **Maximum File Size**: Current upload ceiling is 5 MB per document to prevent serverless function memory exhaustion.

---

<sub>AskGuru is an independent learning project, not affiliated with any other product named Guru.</sub>
