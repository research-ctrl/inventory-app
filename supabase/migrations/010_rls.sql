-- ============================================================
-- 010_rls.sql
-- Row-Level Security — helper functions, table enablement and
-- granular policies for the Shipyard Material Lifecycle System.
--
-- Depends on: 002_core.sql through 009_views_rpc.sql
-- ============================================================


-- ============================================================
-- SECTION 1: HELPER ROLE FUNCTIONS
-- Each function reads auth.uid() once and is SECURITY DEFINER
-- so the inner SELECT runs as the function owner (bypasses RLS
-- on profiles during the role lookup itself).
-- All functions are STABLE — safe to call multiple times per
-- query without repeated evaluation.
-- ============================================================

CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role::TEXT
  FROM   public.profiles
  WHERE  id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOL
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.auth_role() IN ('super_admin', 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_procurement()
RETURNS BOOL
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.auth_role() IN ('procurement_manager', 'procurement_officer');
$$;

CREATE OR REPLACE FUNCTION public.is_approver()
RETURNS BOOL
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.auth_role() IN ('approver', 'procurement_manager', 'admin', 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_qc()
RETURNS BOOL
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.auth_role() IN ('qc_inspector', 'store_manager', 'admin', 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_stores()
RETURNS BOOL
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.auth_role() IN ('store_keeper', 'store_manager', 'admin', 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_finance()
RETURNS BOOL
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.auth_role() IN ('finance', 'admin', 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_shipbuilder()
RETURNS BOOL
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.auth_role() IN ('shipbuilder', 'engineer');
$$;

-- Any authenticated session (role check not needed — Supabase
-- sets auth.role() = 'authenticated' for logged-in users).
CREATE OR REPLACE FUNCTION public.is_viewer()
RETURNS BOOL
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.role() = 'authenticated';
$$;


-- ============================================================
-- SECTION 2: ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================

ALTER TABLE public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vessels                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_locations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seq_counters            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_history        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log               ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.requirements            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_items       ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.vendors                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_contacts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_items                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments                ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.deliveries              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_items          ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.qc_inspections          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_defects              ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.inventory_pins          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.material_issues         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recoveries              ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.chat_sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeddings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_documents           ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- SECTION 3: POLICIES
-- Naming convention: <table>_<operation>_<qualifier>
-- ============================================================


-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------

-- Own profile is always readable
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- Admins can read every profile
CREATE POLICY profiles_select_admin
  ON public.profiles
  FOR SELECT
  USING (public.is_admin());

-- Admins can insert new profiles (e.g. back-office onboarding)
CREATE POLICY profiles_insert_admin
  ON public.profiles
  FOR INSERT
  WITH CHECK (public.is_admin());

-- A user may update their own non-sensitive fields.
-- Sensitive fields (role, is_active) are protected by the
-- trigger / application layer; RLS just gates the row.
CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  USING  (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can update any profile (role changes, deactivation, etc.)
CREATE POLICY profiles_update_admin
  ON public.profiles
  FOR UPDATE
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

-- Only admins may delete profiles
CREATE POLICY profiles_delete_admin
  ON public.profiles
  FOR DELETE
  USING (public.is_admin());


-- ------------------------------------------------------------
-- vessels
-- ------------------------------------------------------------

CREATE POLICY vessels_select_authenticated
  ON public.vessels
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY vessels_insert_admin_stores
  ON public.vessels
  FOR INSERT
  WITH CHECK (public.is_admin() OR public.auth_role() = 'store_manager');

CREATE POLICY vessels_update_admin_stores
  ON public.vessels
  FOR UPDATE
  USING  (public.is_admin() OR public.auth_role() = 'store_manager')
  WITH CHECK (public.is_admin() OR public.auth_role() = 'store_manager');

CREATE POLICY vessels_delete_admin
  ON public.vessels
  FOR DELETE
  USING (public.is_admin());


-- ------------------------------------------------------------
-- departments
-- ------------------------------------------------------------

CREATE POLICY departments_select_authenticated
  ON public.departments
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY departments_insert_admin_stores
  ON public.departments
  FOR INSERT
  WITH CHECK (public.is_admin() OR public.auth_role() = 'store_manager');

CREATE POLICY departments_update_admin_stores
  ON public.departments
  FOR UPDATE
  USING  (public.is_admin() OR public.auth_role() = 'store_manager')
  WITH CHECK (public.is_admin() OR public.auth_role() = 'store_manager');

CREATE POLICY departments_delete_admin
  ON public.departments
  FOR DELETE
  USING (public.is_admin());


-- ------------------------------------------------------------
-- store_locations
-- ------------------------------------------------------------

CREATE POLICY store_locations_select_authenticated
  ON public.store_locations
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY store_locations_insert_admin_stores
  ON public.store_locations
  FOR INSERT
  WITH CHECK (public.is_admin() OR public.auth_role() = 'store_manager');

CREATE POLICY store_locations_update_admin_stores
  ON public.store_locations
  FOR UPDATE
  USING  (public.is_admin() OR public.auth_role() = 'store_manager')
  WITH CHECK (public.is_admin() OR public.auth_role() = 'store_manager');

CREATE POLICY store_locations_delete_admin
  ON public.store_locations
  FOR DELETE
  USING (public.is_admin());


-- ------------------------------------------------------------
-- seq_counters  (system-managed; only SECURITY DEFINER
-- functions should ever write these rows)
-- ------------------------------------------------------------

CREATE POLICY seq_counters_select_authenticated
  ON public.seq_counters
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- No direct INSERT / UPDATE / DELETE from user sessions.
-- The next_ref() SECURITY DEFINER function bypasses RLS when
-- it writes to this table.


-- ------------------------------------------------------------
-- vendors
-- ------------------------------------------------------------

CREATE POLICY vendors_select_authenticated
  ON public.vendors
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY vendors_insert_procurement_admin
  ON public.vendors
  FOR INSERT
  WITH CHECK (public.is_procurement() OR public.is_admin());

CREATE POLICY vendors_update_procurement_admin
  ON public.vendors
  FOR UPDATE
  USING  (public.is_procurement() OR public.is_admin())
  WITH CHECK (public.is_procurement() OR public.is_admin());

CREATE POLICY vendors_delete_admin
  ON public.vendors
  FOR DELETE
  USING (public.is_admin());


-- ------------------------------------------------------------
-- vendor_contacts
-- ------------------------------------------------------------

CREATE POLICY vendor_contacts_select_authenticated
  ON public.vendor_contacts
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY vendor_contacts_insert_procurement_admin
  ON public.vendor_contacts
  FOR INSERT
  WITH CHECK (public.is_procurement() OR public.is_admin());

CREATE POLICY vendor_contacts_update_procurement_admin
  ON public.vendor_contacts
  FOR UPDATE
  USING  (public.is_procurement() OR public.is_admin())
  WITH CHECK (public.is_procurement() OR public.is_admin());

CREATE POLICY vendor_contacts_delete_admin
  ON public.vendor_contacts
  FOR DELETE
  USING (public.is_admin());


-- ------------------------------------------------------------
-- requirements
-- ------------------------------------------------------------

CREATE POLICY requirements_select_authenticated
  ON public.requirements
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Any authenticated user may raise a requirement
CREATE POLICY requirements_insert_authenticated
  ON public.requirements
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- The owner may edit their own draft; procurement managers and
-- admins may edit any requirement regardless of status.
CREATE POLICY requirements_update_own_draft
  ON public.requirements
  FOR UPDATE
  USING (
    (requested_by = auth.uid() AND status = 'draft')
    OR public.is_admin()
    OR public.auth_role() = 'procurement_manager'
  )
  WITH CHECK (
    (requested_by = auth.uid() AND status = 'draft')
    OR public.is_admin()
    OR public.auth_role() = 'procurement_manager'
  );

-- Owner can delete their own draft; admins can delete anything
CREATE POLICY requirements_delete_own_draft_or_admin
  ON public.requirements
  FOR DELETE
  USING (
    (requested_by = auth.uid() AND status = 'draft')
    OR public.is_admin()
  );


-- ------------------------------------------------------------
-- requirement_items
-- (inherits row visibility from the parent requirement)
-- ------------------------------------------------------------

CREATE POLICY requirement_items_select_authenticated
  ON public.requirement_items
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY requirement_items_insert_authenticated
  ON public.requirement_items
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.requirements r
      WHERE r.id = requirement_id
        AND (
          r.requested_by = auth.uid()
          OR public.is_admin()
          OR public.auth_role() = 'procurement_manager'
        )
    )
  );

CREATE POLICY requirement_items_update_owner_or_privileged
  ON public.requirement_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.requirements r
      WHERE r.id = requirement_id
        AND (
          (r.requested_by = auth.uid() AND r.status = 'draft')
          OR public.is_admin()
          OR public.auth_role() = 'procurement_manager'
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.requirements r
      WHERE r.id = requirement_id
        AND (
          (r.requested_by = auth.uid() AND r.status = 'draft')
          OR public.is_admin()
          OR public.auth_role() = 'procurement_manager'
        )
    )
  );

CREATE POLICY requirement_items_delete_admin
  ON public.requirement_items
  FOR DELETE
  USING (public.is_admin());


-- ------------------------------------------------------------
-- approvals
-- ------------------------------------------------------------

-- Approvers see their own pending approvals; admins and
-- procurement managers see all.
CREATE POLICY approvals_select_own_or_privileged
  ON public.approvals
  FOR SELECT
  USING (
    approver_id = auth.uid()
    OR public.is_admin()
    OR public.auth_role() = 'procurement_manager'
  );

-- Only admins and procurement managers create approval records
-- (typically done by a SECURITY DEFINER workflow trigger, but
-- this policy covers direct inserts from privileged sessions).
CREATE POLICY approvals_insert_admin_procurement
  ON public.approvals
  FOR INSERT
  WITH CHECK (public.is_admin() OR public.auth_role() = 'procurement_manager');

-- Approvers may record their own decision; admins override all
CREATE POLICY approvals_update_own_decision_or_admin
  ON public.approvals
  FOR UPDATE
  USING (
    approver_id = auth.uid()
    OR public.is_admin()
  )
  WITH CHECK (
    approver_id = auth.uid()
    OR public.is_admin()
  );

-- No direct deletes — approval history is permanent
-- (handled at application / trigger layer)


-- ------------------------------------------------------------
-- purchase_orders
-- ------------------------------------------------------------

CREATE POLICY purchase_orders_select_authenticated
  ON public.purchase_orders
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY purchase_orders_insert_procurement_admin
  ON public.purchase_orders
  FOR INSERT
  WITH CHECK (public.is_procurement() OR public.is_admin());

-- Creator may edit their own draft; procurement manager / admin
-- may edit any PO.
CREATE POLICY purchase_orders_update_own_draft_or_privileged
  ON public.purchase_orders
  FOR UPDATE
  USING (
    (created_by = auth.uid() AND status = 'draft')
    OR public.is_admin()
    OR public.auth_role() = 'procurement_manager'
  )
  WITH CHECK (
    (created_by = auth.uid() AND status = 'draft')
    OR public.is_admin()
    OR public.auth_role() = 'procurement_manager'
  );

CREATE POLICY purchase_orders_delete_own_draft_or_admin
  ON public.purchase_orders
  FOR DELETE
  USING (
    (created_by = auth.uid() AND status = 'draft')
    OR public.is_admin()
  );


-- ------------------------------------------------------------
-- po_items
-- ------------------------------------------------------------

CREATE POLICY po_items_select_authenticated
  ON public.po_items
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY po_items_insert_procurement_admin
  ON public.po_items
  FOR INSERT
  WITH CHECK (
    public.is_procurement() OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = po_id AND po.created_by = auth.uid() AND po.status = 'draft'
    )
  );

CREATE POLICY po_items_update_procurement_admin
  ON public.po_items
  FOR UPDATE
  USING (
    public.is_admin()
    OR public.auth_role() = 'procurement_manager'
    OR EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = po_id AND po.created_by = auth.uid() AND po.status = 'draft'
    )
  )
  WITH CHECK (
    public.is_admin()
    OR public.auth_role() = 'procurement_manager'
    OR EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = po_id AND po.created_by = auth.uid() AND po.status = 'draft'
    )
  );

CREATE POLICY po_items_delete_admin_or_draft_owner
  ON public.po_items
  FOR DELETE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = po_id AND po.created_by = auth.uid() AND po.status = 'draft'
    )
  );


-- ------------------------------------------------------------
-- payments
-- ------------------------------------------------------------

CREATE POLICY payments_select_finance_procurement_admin
  ON public.payments
  FOR SELECT
  USING (
    public.is_finance()
    OR public.is_admin()
    OR public.auth_role() = 'procurement_manager'
  );

CREATE POLICY payments_insert_finance_admin
  ON public.payments
  FOR INSERT
  WITH CHECK (public.is_finance() OR public.is_admin());

CREATE POLICY payments_update_finance_admin
  ON public.payments
  FOR UPDATE
  USING  (public.is_finance() OR public.is_admin())
  WITH CHECK (public.is_finance() OR public.is_admin());

CREATE POLICY payments_delete_admin
  ON public.payments
  FOR DELETE
  USING (public.is_admin());


-- ------------------------------------------------------------
-- deliveries
-- ------------------------------------------------------------

CREATE POLICY deliveries_select_authenticated
  ON public.deliveries
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY deliveries_insert_stores_procurement_admin
  ON public.deliveries
  FOR INSERT
  WITH CHECK (
    public.is_stores() OR public.is_procurement() OR public.is_admin()
  );

CREATE POLICY deliveries_update_stores_procurement_admin
  ON public.deliveries
  FOR UPDATE
  USING (
    public.is_stores() OR public.is_procurement() OR public.is_admin()
  )
  WITH CHECK (
    public.is_stores() OR public.is_procurement() OR public.is_admin()
  );

CREATE POLICY deliveries_delete_admin
  ON public.deliveries
  FOR DELETE
  USING (public.is_admin());


-- ------------------------------------------------------------
-- delivery_items
-- ------------------------------------------------------------

CREATE POLICY delivery_items_select_authenticated
  ON public.delivery_items
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY delivery_items_insert_stores_procurement_admin
  ON public.delivery_items
  FOR INSERT
  WITH CHECK (
    public.is_stores() OR public.is_procurement() OR public.is_admin()
  );

CREATE POLICY delivery_items_update_stores_procurement_admin
  ON public.delivery_items
  FOR UPDATE
  USING (
    public.is_stores() OR public.is_procurement() OR public.is_admin()
  )
  WITH CHECK (
    public.is_stores() OR public.is_procurement() OR public.is_admin()
  );

CREATE POLICY delivery_items_delete_admin
  ON public.delivery_items
  FOR DELETE
  USING (public.is_admin());


-- ------------------------------------------------------------
-- qc_inspections
-- ------------------------------------------------------------

CREATE POLICY qc_inspections_select_authenticated
  ON public.qc_inspections
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY qc_inspections_insert_qc_admin
  ON public.qc_inspections
  FOR INSERT
  WITH CHECK (public.is_qc() OR public.is_admin());

-- Inspector may update their own record; admins override all
CREATE POLICY qc_inspections_update_own_or_admin
  ON public.qc_inspections
  FOR UPDATE
  USING  (inspector_id = auth.uid() OR public.is_admin())
  WITH CHECK (inspector_id = auth.uid() OR public.is_admin());

CREATE POLICY qc_inspections_delete_admin
  ON public.qc_inspections
  FOR DELETE
  USING (public.is_admin());


-- ------------------------------------------------------------
-- qc_defects
-- ------------------------------------------------------------

CREATE POLICY qc_defects_select_authenticated
  ON public.qc_defects
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY qc_defects_insert_qc_admin
  ON public.qc_defects
  FOR INSERT
  WITH CHECK (
    public.is_qc() OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.qc_inspections qi
      WHERE qi.id = inspection_id AND qi.inspector_id = auth.uid()
    )
  );

CREATE POLICY qc_defects_update_own_inspector_or_admin
  ON public.qc_defects
  FOR UPDATE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.qc_inspections qi
      WHERE qi.id = inspection_id AND qi.inspector_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.qc_inspections qi
      WHERE qi.id = inspection_id AND qi.inspector_id = auth.uid()
    )
  );

CREATE POLICY qc_defects_delete_admin
  ON public.qc_defects
  FOR DELETE
  USING (public.is_admin());


-- ------------------------------------------------------------
-- inventory_pins
-- ------------------------------------------------------------

CREATE POLICY inventory_pins_select_authenticated
  ON public.inventory_pins
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY inventory_pins_insert_stores_admin
  ON public.inventory_pins
  FOR INSERT
  WITH CHECK (public.is_stores() OR public.is_admin());

CREATE POLICY inventory_pins_update_stores_admin
  ON public.inventory_pins
  FOR UPDATE
  USING  (public.is_stores() OR public.is_admin())
  WITH CHECK (public.is_stores() OR public.is_admin());

CREATE POLICY inventory_pins_delete_admin
  ON public.inventory_pins
  FOR DELETE
  USING (public.is_admin());


-- ------------------------------------------------------------
-- inventory_transactions  (IMMUTABLE LEDGER)
-- No UPDATE or DELETE policies are created — Postgres will
-- deny those operations even for admins at the RLS layer.
-- Inserts are restricted to stores staff and admins; the
-- recalculate_pin_quantity() SECURITY DEFINER function may
-- also write entries internally.
-- ------------------------------------------------------------

CREATE POLICY inventory_transactions_select_authenticated
  ON public.inventory_transactions
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY inventory_transactions_insert_stores_admin
  ON public.inventory_transactions
  FOR INSERT
  WITH CHECK (public.is_stores() OR public.is_admin());

-- Intentionally no UPDATE or DELETE policies.


-- ------------------------------------------------------------
-- material_issues
-- ------------------------------------------------------------

CREATE POLICY material_issues_select_authenticated
  ON public.material_issues
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Any authenticated user may raise a material issue request
CREATE POLICY material_issues_insert_authenticated
  ON public.material_issues
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- The requester can edit their own draft issue; stores staff
-- and admins can edit any issue.
CREATE POLICY material_issues_update_own_draft_or_stores
  ON public.material_issues
  FOR UPDATE
  USING (
    (issued_to = auth.uid() AND status = 'draft')
    OR public.is_stores()
    OR public.is_admin()
  )
  WITH CHECK (
    (issued_to = auth.uid() AND status = 'draft')
    OR public.is_stores()
    OR public.is_admin()
  );

-- Owner can delete their own draft; admins can delete anything
CREATE POLICY material_issues_delete_own_draft_or_admin
  ON public.material_issues
  FOR DELETE
  USING (
    (issued_to = auth.uid() AND status = 'draft')
    OR public.is_admin()
  );


-- ------------------------------------------------------------
-- recoveries
-- ------------------------------------------------------------

CREATE POLICY recoveries_select_authenticated
  ON public.recoveries
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY recoveries_insert_stores_admin
  ON public.recoveries
  FOR INSERT
  WITH CHECK (public.is_stores() OR public.is_admin());

CREATE POLICY recoveries_update_stores_admin
  ON public.recoveries
  FOR UPDATE
  USING  (public.is_stores() OR public.is_admin())
  WITH CHECK (public.is_stores() OR public.is_admin());

CREATE POLICY recoveries_delete_admin
  ON public.recoveries
  FOR DELETE
  USING (public.is_admin());


-- ------------------------------------------------------------
-- chat_sessions
-- ------------------------------------------------------------

CREATE POLICY chat_sessions_select_own_or_admin
  ON public.chat_sessions
  FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY chat_sessions_insert_own
  ON public.chat_sessions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY chat_sessions_update_own
  ON public.chat_sessions
  FOR UPDATE
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY chat_sessions_delete_own_or_admin
  ON public.chat_sessions
  FOR DELETE
  USING (user_id = auth.uid() OR public.is_admin());


-- ------------------------------------------------------------
-- chat_messages
-- (scope through the parent chat_session)
-- ------------------------------------------------------------

CREATE POLICY chat_messages_select_own_session_or_admin
  ON public.chat_messages
  FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.chat_sessions cs
      WHERE cs.id = session_id AND cs.user_id = auth.uid()
    )
  );

CREATE POLICY chat_messages_insert_own_session
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions cs
      WHERE cs.id = session_id AND cs.user_id = auth.uid()
    )
  );

CREATE POLICY chat_messages_update_own_session
  ON public.chat_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions cs
      WHERE cs.id = session_id AND cs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions cs
      WHERE cs.id = session_id AND cs.user_id = auth.uid()
    )
  );

CREATE POLICY chat_messages_delete_own_session_or_admin
  ON public.chat_messages
  FOR DELETE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.chat_sessions cs
      WHERE cs.id = session_id AND cs.user_id = auth.uid()
    )
  );


-- ------------------------------------------------------------
-- embeddings
-- ------------------------------------------------------------

CREATE POLICY embeddings_select_authenticated
  ON public.embeddings
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY embeddings_insert_admin
  ON public.embeddings
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY embeddings_update_admin
  ON public.embeddings
  FOR UPDATE
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY embeddings_delete_admin
  ON public.embeddings
  FOR DELETE
  USING (public.is_admin());


-- ------------------------------------------------------------
-- sop_documents
-- ------------------------------------------------------------

CREATE POLICY sop_documents_select_authenticated
  ON public.sop_documents
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY sop_documents_insert_admin
  ON public.sop_documents
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY sop_documents_update_admin
  ON public.sop_documents
  FOR UPDATE
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY sop_documents_delete_admin
  ON public.sop_documents
  FOR DELETE
  USING (public.is_admin());


-- ------------------------------------------------------------
-- workflow_history  (APPEND-ONLY via SECURITY DEFINER triggers)
-- Authenticated users can read the audit trail.
-- No direct INSERT / UPDATE / DELETE from user sessions —
-- the workflow trigger functions are SECURITY DEFINER and
-- bypass RLS when they write.
-- ------------------------------------------------------------

CREATE POLICY workflow_history_select_authenticated
  ON public.workflow_history
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Intentionally no INSERT / UPDATE / DELETE policies for
-- direct user access — all writes go through SECURITY DEFINER
-- trigger functions.


-- ------------------------------------------------------------
-- audit_log  (APPEND-ONLY via SECURITY DEFINER triggers)
-- ------------------------------------------------------------

CREATE POLICY audit_log_select_authenticated
  ON public.audit_log
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Intentionally no INSERT / UPDATE / DELETE policies for
-- direct user access — all writes go through SECURITY DEFINER
-- trigger functions.


-- ------------------------------------------------------------
-- notifications
-- ------------------------------------------------------------

-- Each user sees only their own notifications; admins see all
CREATE POLICY notifications_select_own_or_admin
  ON public.notifications
  FOR SELECT
  USING (recipient_id = auth.uid() OR public.is_admin());

-- Users may mark their own notifications as read
CREATE POLICY notifications_update_own
  ON public.notifications
  FOR UPDATE
  USING  (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Only admins (or SECURITY DEFINER system functions) create
-- or delete notification records
CREATE POLICY notifications_insert_admin
  ON public.notifications
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY notifications_delete_admin
  ON public.notifications
  FOR DELETE
  USING (public.is_admin());
