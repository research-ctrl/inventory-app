-- ============================================================
-- 002_core.sql  — Enums, core tables, sequences, audit
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE public.user_role AS ENUM (
  'super_admin',
  'admin',
  'procurement_manager',
  'procurement_officer',
  'store_manager',
  'store_keeper',
  'qc_inspector',
  'engineer',
  'approver',
  'finance',
  'shipbuilder',
  'viewer'
);

CREATE TYPE public.item_status AS ENUM (
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'in_progress',
  'ordered',
  'partially_delivered',
  'delivered',
  'received',
  'qc_pending',
  'qc_passed',
  'qc_failed',
  'qc_conditional',
  'issued',
  'partially_returned',
  'fully_returned',
  'closed',
  'cancelled',
  'on_hold',
  'pending_assessment',
  'assessed',
  'repair_pending',
  'repaired',
  'scrapped',
  'for_sale'
);

CREATE TYPE public.urgency_level AS ENUM (
  'routine',
  'urgent',
  'critical'
);

CREATE TYPE public.qc_result AS ENUM (
  'pass',
  'fail',
  'conditional'
);

CREATE TYPE public.recovery_outcome AS ENUM (
  'reuse',
  'repair',
  'scrap',
  'sell'
);

CREATE TYPE public.transaction_type AS ENUM (
  'receipt',
  'issue',
  'return',
  'adjustment',
  'transfer',
  'write_off',
  'reversal'
);

CREATE TYPE public.workflow_event AS ENUM (
  'submit',
  'approve',
  'reject',
  'revise',
  'raise_po',
  'place_order',
  'receive',
  'send_to_qc',
  'start_inspection',
  'pass_inspection',
  'fail_inspection',
  'conditional_inspection',
  'accept_into_inventory',
  'initiate_return',
  'issue_material',
  'partial_return',
  'full_return',
  'close',
  'cancel',
  'assess',
  'mark_reuse',
  'send_for_repair',
  'mark_repaired',
  'scrap_material',
  'list_for_sale',
  'hold',
  'resume'
);

-- ============================================================
-- PROFILES
-- ============================================================

CREATE TABLE public.profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT        NOT NULL UNIQUE,
  full_name    TEXT,
  avatar_url   TEXT,
  role         public.user_role NOT NULL DEFAULT 'viewer',
  department   TEXT,
  employee_id  TEXT        UNIQUE,
  phone        TEXT,
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- VESSELS
-- ============================================================

CREATE TABLE public.vessels (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT        NOT NULL,
  imo_number   TEXT        UNIQUE,
  vessel_type  TEXT,
  flag         TEXT,
  owner        TEXT,
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- DEPARTMENTS
-- ============================================================

CREATE TABLE public.departments (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code       TEXT        NOT NULL UNIQUE,
  name       TEXT        NOT NULL,
  head_id    UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SEQUENCE COUNTERS
-- ============================================================

CREATE TABLE public.seq_counters (
  entity_type TEXT   PRIMARY KEY,
  last_val    BIGINT NOT NULL DEFAULT 0
);

INSERT INTO public.seq_counters (entity_type) VALUES
  ('requirement'),
  ('purchase_order'),
  ('delivery'),
  ('issue'),
  ('recovery'),
  ('qc_inspection');

-- ============================================================
-- FUNCTION: next_ref
-- Atomically increments the counter and returns a formatted ref.
-- ============================================================

CREATE OR REPLACE FUNCTION public.next_ref(
  p_entity_type TEXT,
  p_prefix      TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_val BIGINT;
BEGIN
  UPDATE public.seq_counters
     SET last_val = last_val + 1
   WHERE entity_type = p_entity_type
  RETURNING last_val INTO v_new_val;

  IF v_new_val IS NULL THEN
    RAISE EXCEPTION 'Unknown entity_type for seq_counters: %', p_entity_type;
  END IF;

  RETURN p_prefix || '-' || lpad(v_new_val::TEXT, 6, '0');
END;
$$;

-- ============================================================
-- WORKFLOW HISTORY
-- ============================================================

CREATE TABLE public.workflow_history (
  id           UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type  TEXT              NOT NULL,
  entity_id    UUID              NOT NULL,
  from_status  public.item_status,
  to_status    public.item_status NOT NULL,
  event        public.workflow_event NOT NULL,
  actor_id     UUID              REFERENCES public.profiles(id) ON DELETE SET NULL,
  comment      TEXT,
  metadata     JSONB,
  created_at   TIMESTAMPTZ       NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_history_entity
  ON public.workflow_history (entity_type, entity_id);

CREATE INDEX idx_workflow_history_actor
  ON public.workflow_history (actor_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE public.notifications (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id  UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type   TEXT,
  entity_id     UUID,
  title         TEXT        NOT NULL,
  body          TEXT,
  is_read       BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient
  ON public.notifications (recipient_id, is_read);

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE public.audit_log (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  action       TEXT        NOT NULL,
  entity_type  TEXT        NOT NULL,
  entity_id    UUID,
  ip_address   TEXT,
  old_data     JSONB,
  new_data     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_entity
  ON public.audit_log (entity_type, entity_id);

CREATE INDEX idx_audit_log_actor
  ON public.audit_log (actor_id);

-- ============================================================
-- TRIGGER FUNCTION: set_updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply set_updated_at to tables that have updated_at
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_vessels_updated_at
  BEFORE UPDATE ON public.vessels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
