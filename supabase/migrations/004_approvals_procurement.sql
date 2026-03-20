-- ============================================================
-- 004_approvals_procurement.sql
-- Vendors, approvals, purchase orders, PO line items, payments
-- ============================================================

-- ============================================================
-- VENDORS
-- ============================================================

CREATE TABLE public.vendors (
  id                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                TEXT         NOT NULL UNIQUE,
  name                TEXT         NOT NULL,
  trade_name          TEXT,
  email               TEXT,
  phone               TEXT,
  website             TEXT,
  address_line1       TEXT,
  address_line2       TEXT,
  city                TEXT,
  country             TEXT,
  postal_code         TEXT,
  category            TEXT,
  rating              NUMERIC(3,1) NOT NULL DEFAULT 0
                        CHECK (rating BETWEEN 0 AND 5),
  payment_terms_days  INT          NOT NULL DEFAULT 30,
  currency            CHAR(3)      NOT NULL DEFAULT 'USD',
  tax_id              TEXT,
  bank_details        JSONB,
  is_approved         BOOLEAN      NOT NULL DEFAULT false,
  approved_by         UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at         TIMESTAMPTZ,
  blacklisted         BOOLEAN      NOT NULL DEFAULT false,
  blacklist_reason    TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- VENDOR CONTACTS
-- ============================================================

CREATE TABLE public.vendor_contacts (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id    UUID        NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  designation  TEXT,
  email        TEXT,
  phone        TEXT,
  is_primary   BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vendor_contacts_vendor
  ON public.vendor_contacts (vendor_id);

-- ============================================================
-- APPROVALS
-- ============================================================

CREATE TABLE public.approvals (
  id           UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type  TEXT              NOT NULL,
  entity_id    UUID              NOT NULL,
  step_number  INT               NOT NULL DEFAULT 1,
  approver_id  UUID              NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status       public.item_status NOT NULL DEFAULT 'pending_approval',
  comment      TEXT,
  decided_at   TIMESTAMPTZ,
  due_date     TIMESTAMPTZ,
  escalated    BOOLEAN           NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ       NOT NULL DEFAULT now(),

  CONSTRAINT uq_approvals_step UNIQUE (entity_type, entity_id, step_number, approver_id)
);

CREATE INDEX idx_approvals_entity
  ON public.approvals (entity_type, entity_id);

CREATE INDEX idx_approvals_approver_status
  ON public.approvals (approver_id, status);

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================

CREATE TABLE public.purchase_orders (
  id                UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number         TEXT              NOT NULL UNIQUE DEFAULT '',
  requirement_id    UUID              REFERENCES public.requirements(id) ON DELETE SET NULL,
  vendor_id         UUID              NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  status            public.item_status NOT NULL DEFAULT 'draft',
  payment_terms     TEXT,
  delivery_address  TEXT,
  incoterms         TEXT,
  total_amount      NUMERIC(14,2)     NOT NULL DEFAULT 0,
  tax_amount        NUMERIC(14,2)     NOT NULL DEFAULT 0,
  discount_amount   NUMERIC(14,2)     NOT NULL DEFAULT 0,
  currency          CHAR(3)           NOT NULL DEFAULT 'USD',
  expected_delivery DATE,
  actual_delivery   DATE,
  rejection_reason  TEXT,
  approved_by       UUID              REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at       TIMESTAMPTZ,
  ordered_by        UUID              REFERENCES public.profiles(id) ON DELETE SET NULL,
  ordered_at        TIMESTAMPTZ,
  created_by        UUID              NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  notes             TEXT,
  created_at        TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ       NOT NULL DEFAULT now()
);

-- ============================================================
-- TRIGGER FUNCTION: assign PO number on INSERT
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_set_po_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.po_number = '' OR NEW.po_number IS NULL THEN
    NEW.po_number := public.next_ref('purchase_order', 'PO');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_purchase_orders_po_number
  BEFORE INSERT ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_po_number();

CREATE TRIGGER trg_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_purchase_orders_vendor
  ON public.purchase_orders (vendor_id);

CREATE INDEX idx_purchase_orders_status
  ON public.purchase_orders (status);

CREATE INDEX idx_purchase_orders_requirement
  ON public.purchase_orders (requirement_id);

-- ============================================================
-- PO LINE ITEMS
-- ============================================================

CREATE TABLE public.po_items (
  id                   UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id                UUID         NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  requirement_item_id  UUID         REFERENCES public.requirement_items(id) ON DELETE SET NULL,
  line_number          INT          NOT NULL,
  description          TEXT         NOT NULL,
  part_number          TEXT,
  quantity             NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  unit                 TEXT         NOT NULL,
  unit_price           NUMERIC(14,4) NOT NULL,
  currency             CHAR(3)      NOT NULL DEFAULT 'USD',
  tax_rate             NUMERIC(5,2) NOT NULL DEFAULT 0,
  discount_rate        NUMERIC(5,2) NOT NULL DEFAULT 0,
  line_total           NUMERIC(14,2) GENERATED ALWAYS AS (
                         ROUND(
                           quantity
                           * unit_price
                           * (1 - discount_rate / 100.0)
                           * (1 + tax_rate    / 100.0),
                           2
                         )
                       ) STORED,
  notes                TEXT,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT uq_po_items_line UNIQUE (po_id, line_number)
);

CREATE INDEX idx_po_items_po
  ON public.po_items (po_id);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE public.payments (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id            UUID        NOT NULL REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
  payment_ref      TEXT        NOT NULL UNIQUE,
  amount           NUMERIC(14,2) NOT NULL,
  currency         CHAR(3)     NOT NULL DEFAULT 'USD',
  payment_date     DATE,
  payment_method   TEXT
                     CHECK (payment_method IN ('wire', 'cheque', 'cash', 'letter_of_credit')),
  bank_reference   TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'processed', 'failed', 'cancelled')),
  processed_by     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_payments_po
  ON public.payments (po_id);

CREATE INDEX idx_payments_status
  ON public.payments (status);
