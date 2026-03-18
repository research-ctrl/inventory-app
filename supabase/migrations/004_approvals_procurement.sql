-- Approvals and procurement tables

CREATE TABLE public.approvals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type   TEXT NOT NULL,
  entity_id     UUID NOT NULL,
  approver_id   UUID NOT NULL REFERENCES public.profiles(id),
  status        public.item_status NOT NULL DEFAULT 'pending',
  comment       TEXT,
  decided_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.vendors (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  code         TEXT NOT NULL UNIQUE,
  email        TEXT,
  phone        TEXT,
  address      TEXT,
  category     TEXT,
  rating       NUMERIC(3,1) DEFAULT 0,
  is_approved  BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.purchase_orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number         TEXT NOT NULL UNIQUE,
  requirement_id    UUID REFERENCES public.requirements(id),
  vendor_id         UUID NOT NULL REFERENCES public.vendors(id),
  status            public.item_status NOT NULL DEFAULT 'draft',
  total_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency          CHAR(3) NOT NULL DEFAULT 'USD',
  expected_delivery DATE,
  created_by        UUID NOT NULL REFERENCES public.profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
