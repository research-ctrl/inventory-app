-- Requirements module

CREATE TYPE public.urgency_level AS ENUM ('routine', 'urgent', 'critical');
CREATE TYPE public.item_status AS ENUM (
  'draft', 'submitted', 'under_review', 'approved', 'rejected',
  'in_progress', 'completed', 'cancelled', 'on_hold'
);

CREATE TABLE public.requirements (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ref_number    TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  description   TEXT,
  vessel_name   TEXT,
  department    TEXT,
  requested_by  UUID NOT NULL REFERENCES public.profiles(id),
  urgency       public.urgency_level NOT NULL DEFAULT 'routine',
  status        public.item_status NOT NULL DEFAULT 'draft',
  required_date DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.requirement_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requirement_id  UUID NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
  description     TEXT NOT NULL,
  quantity        NUMERIC(12,3) NOT NULL,
  unit            TEXT NOT NULL,
  part_number     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
