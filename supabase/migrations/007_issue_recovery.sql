-- Issue and recovery tables

CREATE TYPE public.recovery_outcome AS ENUM ('reuse', 'repair', 'scrap', 'sell');

CREATE TABLE public.material_issues (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_number TEXT NOT NULL UNIQUE,
  pin_id       UUID NOT NULL REFERENCES public.inventory_pins(id),
  issued_to    UUID NOT NULL REFERENCES public.profiles(id),
  quantity     NUMERIC(12,3) NOT NULL,
  vessel_name  TEXT NOT NULL,
  work_order   TEXT,
  status       public.item_status NOT NULL DEFAULT 'draft',
  issued_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.recoveries (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id            UUID NOT NULL REFERENCES public.material_issues(id),
  pin_id              UUID NOT NULL REFERENCES public.inventory_pins(id),
  quantity_returned   NUMERIC(12,3) NOT NULL,
  outcome             public.recovery_outcome,
  assessed_by         UUID REFERENCES public.profiles(id),
  status              public.item_status NOT NULL DEFAULT 'draft',
  recovered_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
