-- Associate newly uploaded QueryNest documents with their server-authenticated owner.
-- Existing documents remain NULL and are not assigned to any account.
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS owner_user_id TEXT;

CREATE INDEX IF NOT EXISTS documents_owner_created_at_idx
  ON public.documents (owner_user_id, created_at DESC);
