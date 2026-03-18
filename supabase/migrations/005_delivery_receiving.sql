-- Delivery and receiving tables

CREATE TABLE public.deliveries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id         UUID NOT NULL REFERENCES public.purchase_orders(id),
  delivery_ref  TEXT NOT NULL UNIQUE,
  status        public.item_status NOT NULL DEFAULT 'in_progress',
  delivered_at  TIMESTAMPTZ,
  received_by   UUID REFERENCES public.profiles(id),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.delivery_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id  UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  description  TEXT NOT NULL,
  quantity     NUMERIC(12,3) NOT NULL,
  unit         TEXT NOT NULL,
  notes        TEXT
);
