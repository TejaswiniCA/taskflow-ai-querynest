# AGENTS.md — AskGuru Guidelines & Engineering Rules

## 1. Project Overview
**AskGuru** is a production-grade, RAG-based document interrogation platform. Users upload documents (PDF, TXT) and ask natural language questions. AskGuru retrieves verified passages and delivers concise, grounded responses with inline citation chips that link directly to the source page and passage.

## 2. Architecture & Design Rules
- **Stack**: Next.js App Router, TypeScript, Tailwind CSS, Lucide icons, Framer Motion, Vercel AI SDK with Google Gemini provider, PostgreSQL with pgvector.
- **Theming & Design Tokens**: 
  - Indigo primary accent (`hsl(238.7 83.5% 66.7%)`).
  - Dark mode by default (persisted in local storage).
  - Strict 8px spacing scale, 16px base font size, 1.6 line height.
  - Maximum message column width: ~720px.
  - WCAG AA contrast compliance and visible keyboard focus rings.
- **Grounding Mandate**:
  - The model must answer ONLY from retrieved context.
  - If information is not in the context, output: `"I couldn't find that in your documents."`
  - Avoid conversational filler, disclaimers, or unverified claims.
  - Every assertion must be accompanied by page-level citation metadata.

## 3. Git & Quality Standards
- Clean branch-per-phase workflow (`feat/phase-1-design`, `feat/phase-2-rag`, `feat/phase-3-qa-deploy`).
- Atomic commits with clear descriptive commit messages.
- Zero secrets committed to git. Environment variables strictly in `.env.local` / `.env` with comprehensive `.env.example`.
- All reusable UI components located under `src/components/ui` or `src/components`.
