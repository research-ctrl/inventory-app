-- Core tables: profiles, audit_log

CREATE TYPE public.user_role AS ENUM (
  'super_admin', 'admin', 'procurement_manager', 'procurement_officer',
  'store_manager', 'store_keeper', 'qc_inspector', 'engineer', 'approver', 'viewer'
);

CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT,
  role        public.user_role NOT NULL DEFAULT 'viewer',
  department  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id     UUID REFERENCES public.profiles(id),
  action       TEXT NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    UUID,
  old_data     JSONB,
  new_data     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
