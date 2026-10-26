# Project guidance

## Application
- TaskFlow AI + QueryNest is a local interview/demo project using the Next.js App Router, TypeScript, Tailwind CSS, PostgreSQL, pgvector, and Google Gemini.
- The project is not production-ready. Keep local development bound to `127.0.0.1`.

## Data and security
- Never read out or commit `.env.local` or other real environment files. `.env.example` must contain placeholders only.
- Task API routes must resolve ownership from the server-side session and include the authenticated user ID in every task query that reads, updates, or deletes rows.
- QueryNest documents currently use a shared store with no per-user owner column. Do not claim multi-user isolation or public-deployment safety.
- Do not run database migrations or change database data without explicit authorization.
- Do not send document text to the browser as a retrieval fallback or trust browser-supplied text as source context.

## Checks
- Run `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` for relevant code changes.
- Playwright browser tests must intercept API requests and use `docs/sample_document.pdf`; do not connect them to the real database or Gemini APIs.
- `npm run evaluate` requires a Gemini API key and makes external AI requests. Never let it write to a configured database.
