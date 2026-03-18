-- QC and inventory tables

CREATE TYPE public.qc_result AS ENUM ('pass', 'fail', 'conditional');

CREATE TABLE public.qc_inspections (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id  UUID NOT NULL REFERENCES public.deliveries(id),
  inspector_id UUID NOT NULL REFERENCES public.profiles(id),
  result       public.qc_result NOT NULL,
  remarks      TEXT,
  inspected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.store_locations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_pins (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pin_number   TEXT NOT NULL UNIQUE,
  description  TEXT NOT NULL,
  location_id  UUID REFERENCES public.store_locations(id),
  quantity     NUMERIC(12,3) NOT NULL DEFAULT 0,
  unit         TEXT NOT NULL,
  status       public.item_status NOT NULL DEFAULT 'approved',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_transactions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pin_id       UUID NOT NULL REFERENCES public.inventory_pins(id),
  type         TEXT NOT NULL CHECK (type IN ('receipt','issue','return','adjustment','transfer')),
  quantity     NUMERIC(12,3) NOT NULL,
  reference_id UUID,
  actor_id     UUID NOT NULL REFERENCES public.profiles(id),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
