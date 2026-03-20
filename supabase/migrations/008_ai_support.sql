-- ============================================================
-- 008_ai_support.sql
-- AI assistant support tables: chat sessions, messages,
-- vector embeddings, and SOP document store.
--
-- Depends on: 001_extensions.sql (pgvector), 002_core.sql
-- The pgvector extension must be enabled before this migration.
-- ============================================================

-- ============================================================
-- CHAT SESSIONS
-- ============================================================

CREATE TABLE public.chat_sessions (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL DEFAULT 'New Chat',
  -- Stores current module context and active filters for the session
  context       JSONB       NOT NULL DEFAULT '{}',
  message_count INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_chat_sessions_user_id
  ON public.chat_sessions (user_id);

-- ============================================================
-- CHAT MESSAGES
-- ============================================================

CREATE TABLE public.chat_messages (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID        NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL
                CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content     TEXT        NOT NULL,
  tool_name   TEXT,
  -- Array of {name, args, result} objects for tool-use turns
  tool_calls  JSONB,
  tokens_used INT,
  latency_ms  INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_session_created
  ON public.chat_messages (session_id, created_at);

-- ============================================================
-- TRIGGER: increment chat_sessions.message_count on INSERT
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_increment_message_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.chat_sessions
     SET message_count = message_count + 1,
         updated_at    = now()
   WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_chat_messages_increment_count
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_increment_message_count();

-- ============================================================
-- EMBEDDINGS
-- Stores dense vector embeddings for semantic search across
-- requirements, vendors, inventory PINs, and SOP documents.
-- ============================================================

CREATE TABLE public.embeddings (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT        NOT NULL,   -- 'requirement','vendor','inventory_pin','sop_document'
  entity_id   UUID        NOT NULL,
  content     TEXT        NOT NULL,   -- the text that was embedded
  embedding   vector(1536),
  model       TEXT        NOT NULL DEFAULT 'text-embedding-004',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_embeddings_entity UNIQUE (entity_type, entity_id)
);

CREATE TRIGGER trg_embeddings_updated_at
  BEFORE UPDATE ON public.embeddings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- IVFFlat index for approximate nearest-neighbour cosine search.
-- lists=100 is suitable for tables up to ~1 M rows; tune as needed.
CREATE INDEX idx_embeddings_ivfflat_cosine
  ON public.embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX idx_embeddings_entity_type
  ON public.embeddings (entity_type);

-- ============================================================
-- SOP DOCUMENTS
-- ============================================================

CREATE TABLE public.sop_documents (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title          TEXT        NOT NULL,
  category       TEXT
                   CHECK (category IN (
                     'procurement',
                     'safety',
                     'qc',
                     'stores',
                     'general'
                   )),
  content        TEXT        NOT NULL,
  version        TEXT        NOT NULL DEFAULT '1.0',
  effective_date DATE,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_by     UUID        REFERENCES public.profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_sop_documents_updated_at
  BEFORE UPDATE ON public.sop_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_sop_documents_category_active
  ON public.sop_documents (category, is_active);

-- ============================================================
-- FUNCTION: match_embeddings
-- Performs a cosine similarity search and returns the top-N
-- results above the supplied threshold.
--
-- Usage:
--   SELECT * FROM public.match_embeddings(
--     query_embedding := <vector>,
--     match_threshold  := 0.75,
--     match_count      := 10
--   );
-- ============================================================

CREATE OR REPLACE FUNCTION public.match_embeddings(
  query_embedding vector(1536),
  match_threshold FLOAT,
  match_count     INT
)
RETURNS TABLE (
  entity_type TEXT,
  entity_id   UUID,
  content     TEXT,
  similarity  FLOAT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    e.entity_type,
    e.entity_id,
    e.content,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM public.embeddings e
  WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding   -- ascending distance = descending similarity
  LIMIT match_count;
$$;
