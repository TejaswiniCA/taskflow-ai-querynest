# AskGuru

> **Ask your documents. Get answers with proof.**

AskGuru is a polished, production-ready RAG (Retrieval-Augmented Generation) web application that lets you interrogate your documents with complete precision and verifiable citations.

---

## 🌟 Key Features

- **Document Analysis**: Upload PDFs or text files to build a private knowledge base.
- **Verifiable Citations**: Every AI response includes clickable page chips that open the exact source passage in a slide-out inspector drawer.
- **Grounded Answers**: Strict context adherence ensures answers are sourced directly from your files with zero hallucinated filler.
- **Keyboard & Motion**: Designed with smooth animations, accessible keyboard navigation, and theme persistence (Dark / Light).

---

## 🛠️ Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling & UI**: Tailwind CSS, Lucide React, Framer Motion, shadcn/ui design patterns
- **AI & RAG Engine**: Vercel AI SDK + Google Gemini API (Gemini Flash & Gemini Embeddings)
- **Vector Database**: PostgreSQL with `pgvector` (Neon / Supabase)
- **Testing**: Playwright (E2E) & Vitest

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node v22)
- npm or pnpm

### 2. Setup
```bash
# Clone and navigate
cd askguru-docs

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
```

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Phase Roadmap

- [x] **Phase 1: Design First** — High-fidelity UI, mock data, citation drawers, responsive sidebar, theme toggle, and landing hero.
- [ ] **Phase 2: Real RAG** — PDF text extraction, sliding window chunking, Gemini embeddings, pgvector storage, and streaming chat.
- [ ] **Phase 3: Tests & Deployment** — Playwright E2E suites, unit tests, GitHub Actions CI, and Vercel deployment.

---

<sub>AskGuru is an independent learning project, not affiliated with any other product named Guru.</sub>
