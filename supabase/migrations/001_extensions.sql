-- ============================================================
-- 001_extensions.sql  — PostgreSQL extensions
-- ============================================================

-- Core extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";        -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";         -- gen_random_uuid(), crypt()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";          -- trigram similarity search
CREATE EXTENSION IF NOT EXISTS "unaccent";         -- accent-insensitive search
CREATE EXTENSION IF NOT EXISTS "btree_gist";       -- GiST indexes on scalar types
CREATE EXTENSION IF NOT EXISTS "intarray";         -- integer array operators

-- AI / vector search
CREATE EXTENSION IF NOT EXISTS "vector";           -- pgvector for embeddings

-- Full text search config (unaccent wrapper)
CREATE TEXT SEARCH CONFIGURATION public.smls_fts (COPY = pg_catalog.english);
ALTER TEXT SEARCH CONFIGURATION public.smls_fts
  ALTER MAPPING FOR hword, hword_part, word WITH unaccent, english_stem;
