-- ============================================================
-- 009_views_rpc.sql
-- Views and RPC functions for the Shipyard Material Lifecycle
-- System.
--
-- Depends on: 002_core.sql through 008_ai_support.sql
-- ============================================================

-- ============================================================
-- SECTION 1: VIEWS
-- ============================================================

-- ------------------------------------------------------------
-- v_requirement_summary
-- Summarises requirements with requester/approver names,
-- vessel, department and a live item count.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_requirement_summary AS
SELECT
  r.id,
  r.ref_number,
  r.title,
  r.urgency,
  r.status,
  r.required_date,
  r.budget_estimate,
  r.currency,
  v.name                                    AS vessel_name,
  d.name                                    AS department_name,
  req_p.full_name                           AS requested_by_name,
  apr_p.full_name                           AS approved_by_name,
  r.rejection_reason,
  (
    SELECT COUNT(*)
    FROM public.requirement_items ri
    WHERE ri.requirement_id = r.id
  )                                         AS item_count,
  r.created_at,
  r.updated_at
FROM public.requirements         r
LEFT JOIN public.vessels          v   ON v.id  = r.vessel_id
LEFT JOIN public.departments      d   ON d.id  = r.department_id
LEFT JOIN public.profiles         req_p ON req_p.id = r.requested_by
LEFT JOIN public.profiles         apr_p ON apr_p.id = r.approved_by;

-- ------------------------------------------------------------
-- v_po_summary
-- Purchase-order summary with vendor, requirement, creator /
-- approver names and live item / delivery counts.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_po_summary AS
SELECT
  po.id,
  po.po_number,
  v.name                                    AS vendor_name,
  v.code                                    AS vendor_code,
  r.ref_number                              AS requirement_ref,
  po.status,
  po.total_amount,
  po.currency,
  po.expected_delivery,
  po.actual_delivery,
  cb.full_name                              AS created_by_name,
  ab.full_name                              AS approved_by_name,
  (
    SELECT COUNT(*)
    FROM public.po_items pi
    WHERE pi.po_id = po.id
  )                                         AS item_count,
  (
    SELECT COUNT(*)
    FROM public.deliveries dlv
    WHERE dlv.po_id = po.id
  )                                         AS delivered_count,
  po.created_at,
  po.updated_at
FROM public.purchase_orders       po
LEFT JOIN public.vendors           v    ON v.id  = po.vendor_id
LEFT JOIN public.requirements      r    ON r.id  = po.requirement_id
LEFT JOIN public.profiles          cb   ON cb.id = po.created_by
LEFT JOIN public.profiles          ab   ON ab.id = po.approved_by;

-- ------------------------------------------------------------
-- v_delivery_timeline
-- Each delivery with PO / vendor context, receiver name,
-- item count, partial flag and latest QC result.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_delivery_timeline AS
SELECT
  d.id,
  d.delivery_ref,
  po.po_number,
  v.name                                    AS vendor_name,
  d.status,
  d.expected_date,
  d.actual_received_date,
  p.full_name                               AS received_by_name,
  (
    SELECT COUNT(*)
    FROM public.delivery_items di
    WHERE di.delivery_id = d.id
  )                                         AS item_count,
  -- true when at least one line is still partial
  EXISTS (
    SELECT 1
    FROM public.delivery_items di
    WHERE di.delivery_id = d.id
      AND di.is_partial = true
  )                                         AS is_partial,
  -- latest QC result for this delivery
  (
    SELECT qi.result
    FROM   public.qc_inspections qi
    WHERE  qi.delivery_id = d.id
    ORDER  BY qi.created_at DESC
    LIMIT  1
  )                                         AS qc_result,
  d.created_at
FROM public.deliveries            d
LEFT JOIN public.purchase_orders  po ON po.id = d.po_id
LEFT JOIN public.vendors          v  ON v.id  = po.vendor_id
LEFT JOIN public.profiles         p  ON p.id  = d.received_by;

-- ------------------------------------------------------------
-- v_qc_summary
-- QC inspection summary with delivery / PO / vendor context,
-- inspector name and a live defect count.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_qc_summary AS
SELECT
  qi.id,
  -- inspection reference built from the delivery ref + step
  'QC-' || d.delivery_ref                  AS inspection_ref,
  d.delivery_ref,
  po.po_number,
  v.name                                    AS vendor_name,
  p.full_name                               AS inspector_name,
  qi.result,
  -- re-use item_status semantics; map qc_result → status label
  CASE qi.result
    WHEN 'pass'        THEN 'qc_passed'::public.item_status
    WHEN 'fail'        THEN 'qc_failed'::public.item_status
    WHEN 'conditional' THEN 'qc_conditional'::public.item_status
  END                                       AS status,
  qi.inspection_date                        AS inspection_date,
  (
    SELECT COUNT(*)
    FROM public.qc_defects qd
    WHERE qd.inspection_id = qi.id
  )                                         AS defect_count,
  qi.remarks,
  qi.created_at
FROM public.qc_inspections       qi
LEFT JOIN public.deliveries       d   ON d.id   = qi.delivery_id
LEFT JOIN public.purchase_orders  po  ON po.id  = d.po_id
LEFT JOIN public.vendors          v   ON v.id   = po.vendor_id
LEFT JOIN public.profiles         p   ON p.id   = qi.inspector_id;

-- ------------------------------------------------------------
-- v_inventory_status
-- Extends the logical v_stock_balance with commitment,
-- availability and last-transaction dates.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_inventory_status AS
SELECT
  ip.id                                     AS pin_id,
  ip.pin_number,
  ip.description,
  ip.unit,
  sl.code                                   AS location_code,
  sl.name                                   AS location_name,
  -- running balance from signed transactions
  COALESCE(
    SUM(
      CASE it.transaction_type
        WHEN 'receipt'    THEN  it.quantity
        WHEN 'return'     THEN  it.quantity
        WHEN 'adjustment' THEN  it.quantity
        WHEN 'issue'      THEN -it.quantity
        WHEN 'transfer'   THEN -it.quantity
        WHEN 'write_off'  THEN -it.quantity
        WHEN 'reversal'   THEN  it.quantity
        ELSE 0
      END
    ), 0
  )                                         AS current_stock,
  -- committed = approved or actively issued
  COALESCE((
    SELECT SUM(mi.quantity - COALESCE(mi.quantity_returned, 0))
    FROM   public.material_issues mi
    WHERE  mi.pin_id = ip.id
      AND  mi.status IN ('approved', 'issued')
  ), 0)                                     AS quantity_committed,
  -- available = on-hand minus committed
  COALESCE(
    SUM(
      CASE it.transaction_type
        WHEN 'receipt'    THEN  it.quantity
        WHEN 'return'     THEN  it.quantity
        WHEN 'adjustment' THEN  it.quantity
        WHEN 'issue'      THEN -it.quantity
        WHEN 'transfer'   THEN -it.quantity
        WHEN 'write_off'  THEN -it.quantity
        WHEN 'reversal'   THEN  it.quantity
        ELSE 0
      END
    ), 0
  ) - COALESCE((
    SELECT SUM(mi.quantity - COALESCE(mi.quantity_returned, 0))
    FROM   public.material_issues mi
    WHERE  mi.pin_id = ip.id
      AND  mi.status IN ('approved', 'issued')
  ), 0)                                     AS quantity_available,
  -- last receipt date
  MAX(CASE WHEN it.transaction_type = 'receipt' THEN it.created_at END)
                                            AS last_receipt_date,
  -- last issue date
  MAX(CASE WHEN it.transaction_type = 'issue'   THEN it.created_at END)
                                            AS last_issue_date,
  -- simple low-stock flag (reorder threshold = 10 % of last receipt batch or 1)
  (
    COALESCE(
      SUM(
        CASE it.transaction_type
          WHEN 'receipt'    THEN  it.quantity
          WHEN 'return'     THEN  it.quantity
          WHEN 'adjustment' THEN  it.quantity
          WHEN 'issue'      THEN -it.quantity
          WHEN 'transfer'   THEN -it.quantity
          WHEN 'write_off'  THEN -it.quantity
          WHEN 'reversal'   THEN  it.quantity
          ELSE 0
        END
      ), 0
    ) <= 0
  )                                         AS is_low_stock
FROM public.inventory_pins            ip
LEFT JOIN public.store_locations       sl ON sl.id = ip.location_id
LEFT JOIN public.inventory_transactions it ON it.pin_id = ip.id
GROUP BY ip.id, ip.pin_number, ip.description, ip.unit, sl.code, sl.name;

-- ------------------------------------------------------------
-- v_issue_summary
-- Material-issue summary with PIN, vessel, issued-to and
-- approver names.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_issue_summary AS
SELECT
  mi.id,
  mi.issue_number,
  ip.pin_number,
  ip.description                            AS pin_description,
  vv.name                                   AS vessel_name,
  mi.work_order,
  ist.full_name                             AS issued_to_name,
  mi.quantity,
  mi.quantity_returned,
  ip.unit,
  mi.status,
  mi.purpose,
  apr.full_name                             AS approved_by_name,
  mi.issued_at,
  mi.expected_return_date,
  mi.created_at
FROM public.material_issues       mi
LEFT JOIN public.inventory_pins   ip   ON ip.id  = mi.pin_id
LEFT JOIN public.vessels          vv   ON vv.id  = mi.vessel_id
LEFT JOIN public.profiles         ist  ON ist.id = mi.issued_to
LEFT JOIN public.profiles         apr  ON apr.id = mi.approved_by;

-- ------------------------------------------------------------
-- v_recovery_summary
-- Recovery summary with originating issue, PIN, assessor and
-- storage location names.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_recovery_summary AS
SELECT
  rc.id,
  rc.recovery_ref,
  mi.issue_number,
  ip.pin_number,
  rc.quantity_returned,
  rc.outcome,
  rc.status,
  rc.condition_grade,
  p.full_name                               AS assessed_by_name,
  rc.assessed_at,
  dp.pin_number                             AS derived_pin_number,
  sl.code                                   AS recovery_location_code,
  rc.created_at
FROM public.recoveries              rc
LEFT JOIN public.material_issues     mi  ON mi.id  = rc.issue_id
LEFT JOIN public.inventory_pins      ip  ON ip.id  = rc.pin_id
LEFT JOIN public.profiles            p   ON p.id   = rc.assessed_by
LEFT JOIN public.inventory_pins      dp  ON dp.id  = rc.derived_pin_id
LEFT JOIN public.store_locations     sl  ON sl.id  = rc.recovery_location_id;


-- ============================================================
-- SECTION 2: RPC FUNCTIONS
-- ============================================================

-- ------------------------------------------------------------
-- fn_stock_availability
-- Returns stock levels and availability for a single PIN.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_stock_availability(p_pin_id UUID)
RETURNS TABLE (
  pin_id             UUID,
  pin_number         TEXT,
  description        TEXT,
  current_stock      NUMERIC,
  quantity_committed NUMERIC,
  quantity_available NUMERIC,
  location_code      TEXT,
  is_low_stock       BOOL
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    vis.pin_id,
    vis.pin_number,
    vis.description,
    vis.current_stock,
    vis.quantity_committed,
    vis.quantity_available,
    vis.location_code,
    vis.is_low_stock
  FROM public.v_inventory_status vis
  WHERE vis.pin_id = p_pin_id;
$$;

-- ------------------------------------------------------------
-- fn_po_status
-- Full status snapshot for a purchase order by PO number.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_po_status(p_po_number TEXT)
RETURNS TABLE (
  po_number         TEXT,
  vendor_name       TEXT,
  status            public.item_status,
  total_amount      NUMERIC,
  currency          CHAR(3),
  expected_delivery DATE,
  actual_delivery   DATE,
  item_count        BIGINT,
  total_delivered   BIGINT,
  payment_status    TEXT,
  last_delivery_date TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    po.po_number,
    v.name                                    AS vendor_name,
    po.status,
    po.total_amount,
    po.currency,
    po.expected_delivery,
    po.actual_delivery,
    (SELECT COUNT(*) FROM public.po_items pi  WHERE pi.po_id = po.id)
                                              AS item_count,
    (SELECT COUNT(*) FROM public.deliveries d WHERE d.po_id  = po.id)
                                              AS total_delivered,
    (
      SELECT py.status
      FROM   public.payments py
      WHERE  py.po_id = po.id
      ORDER  BY py.created_at DESC
      LIMIT  1
    )                                         AS payment_status,
    (
      SELECT d.actual_received_date
      FROM   public.deliveries d
      WHERE  d.po_id = po.id
        AND  d.actual_received_date IS NOT NULL
      ORDER  BY d.actual_received_date DESC
      LIMIT  1
    )                                         AS last_delivery_date
  FROM public.purchase_orders po
  LEFT JOIN public.vendors v ON v.id = po.vendor_id
  WHERE po.po_number = p_po_number;
$$;

-- ------------------------------------------------------------
-- fn_delivery_timeline
-- All deliveries for a PO with QC status and completeness flag.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_delivery_timeline(p_po_id UUID)
RETURNS TABLE (
  delivery_ref        TEXT,
  status              public.item_status,
  expected_date       DATE,
  actual_received_date TIMESTAMPTZ,
  item_count          BIGINT,
  qc_status           public.qc_result,
  is_complete         BOOL,
  created_at          TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    d.delivery_ref,
    d.status,
    d.expected_date,
    d.actual_received_date,
    (SELECT COUNT(*) FROM public.delivery_items di WHERE di.delivery_id = d.id)
                                              AS item_count,
    -- latest QC result
    (
      SELECT qi.result
      FROM   public.qc_inspections qi
      WHERE  qi.delivery_id = d.id
      ORDER  BY qi.created_at DESC
      LIMIT  1
    )                                         AS qc_status,
    -- complete when no line item remains partial
    NOT EXISTS (
      SELECT 1
      FROM public.delivery_items di
      WHERE di.delivery_id = d.id
        AND di.is_partial = true
    )                                         AS is_complete,
    d.created_at
  FROM public.deliveries d
  WHERE d.po_id = p_po_id
  ORDER BY d.created_at;
$$;

-- ------------------------------------------------------------
-- fn_qc_summary
-- All QC inspections for a delivery with defect counts.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_qc_summary(p_delivery_id UUID)
RETURNS TABLE (
  inspection_ref   TEXT,
  result           public.qc_result,
  status           public.item_status,
  inspector_name   TEXT,
  inspection_date  TIMESTAMPTZ,
  defect_count     BIGINT,
  critical_defects BIGINT,
  remarks          TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    'QC-' || d.delivery_ref                  AS inspection_ref,
    qi.result,
    CASE qi.result
      WHEN 'pass'        THEN 'qc_passed'::public.item_status
      WHEN 'fail'        THEN 'qc_failed'::public.item_status
      WHEN 'conditional' THEN 'qc_conditional'::public.item_status
    END                                       AS status,
    p.full_name                               AS inspector_name,
    qi.inspection_date                        AS inspection_date,
    (SELECT COUNT(*)
     FROM   public.qc_defects qd
     WHERE  qd.inspection_id = qi.id)         AS defect_count,
    (SELECT COUNT(*)
     FROM   public.qc_defects qd
     WHERE  qd.inspection_id = qi.id
       AND  qd.severity = 'critical')         AS critical_defects,
    qi.remarks
  FROM public.qc_inspections qi
  LEFT JOIN public.deliveries d ON d.id  = qi.delivery_id
  LEFT JOIN public.profiles   p ON p.id  = qi.inspector_id
  WHERE qi.delivery_id = p_delivery_id
  ORDER BY qi.inspection_date;
$$;

-- ------------------------------------------------------------
-- fn_material_location
-- Physical location details for a single PIN.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_material_location(p_pin_id UUID)
RETURNS TABLE (
  pin_number    TEXT,
  description   TEXT,
  location_code TEXT,
  location_name TEXT,
  warehouse     TEXT,
  zone          TEXT,
  aisle         TEXT,
  rack          TEXT,
  bin           TEXT,
  current_stock NUMERIC,
  unit          TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    ip.pin_number,
    ip.description,
    sl.code                                   AS location_code,
    sl.name                                   AS location_name,
    sl.warehouse,
    sl.zone,
    sl.aisle,
    sl.rack,
    sl.bin,
    COALESCE(
      SUM(
        CASE it.transaction_type
          WHEN 'receipt'    THEN  it.quantity
          WHEN 'return'     THEN  it.quantity
          WHEN 'adjustment' THEN  it.quantity
          WHEN 'issue'      THEN -it.quantity
          WHEN 'transfer'   THEN -it.quantity
          WHEN 'write_off'  THEN -it.quantity
          WHEN 'reversal'   THEN  it.quantity
          ELSE 0
        END
      ), 0
    )                                         AS current_stock,
    ip.unit
  FROM public.inventory_pins             ip
  LEFT JOIN public.store_locations        sl ON sl.id = ip.location_id
  LEFT JOIN public.inventory_transactions it ON it.pin_id = ip.id
  WHERE ip.id = p_pin_id
  GROUP BY ip.pin_number, ip.description, sl.code, sl.name,
           sl.warehouse, sl.zone, sl.aisle, sl.rack, sl.bin, ip.unit;
$$;

-- ------------------------------------------------------------
-- fn_recovery_status
-- All recovery records for a material issue.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_recovery_status(p_issue_id UUID)
RETURNS TABLE (
  recovery_ref          TEXT,
  quantity_returned     NUMERIC,
  outcome               public.recovery_outcome,
  status                public.item_status,
  condition_grade       TEXT,
  assessed_by_name      TEXT,
  assessed_at           TIMESTAMPTZ,
  derived_pin_number    TEXT,
  recovery_location_code TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    rc.recovery_ref,
    rc.quantity_returned,
    rc.outcome,
    rc.status,
    rc.condition_grade,
    p.full_name                               AS assessed_by_name,
    rc.assessed_at,
    dp.pin_number                             AS derived_pin_number,
    sl.code                                   AS recovery_location_code
  FROM public.recoveries            rc
  LEFT JOIN public.profiles          p   ON p.id  = rc.assessed_by
  LEFT JOIN public.inventory_pins    dp  ON dp.id = rc.derived_pin_id
  LEFT JOIN public.store_locations   sl  ON sl.id = rc.recovery_location_id
  WHERE rc.issue_id = p_issue_id
  ORDER BY rc.created_at;
$$;

-- ------------------------------------------------------------
-- fn_genealogy_trace
-- Full lineage (ancestors + descendants) for a PIN using two
-- recursive CTEs unified into one result set.
-- Negative depth = ancestor, zero = self, positive = descendant.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_genealogy_trace(p_pin_id UUID)
RETURNS TABLE (
  id               UUID,
  pin_number       TEXT,
  description      TEXT,
  parent_pin_id    UUID,
  origin_type      TEXT,
  origin_reference TEXT,
  depth            INT,
  lineage          TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  -- Ancestors: walk upward from the starting PIN
  WITH RECURSIVE anc AS (
    SELECT
      ip.id,
      ip.pin_number,
      ip.description,
      ip.parent_pin_id,
      ip.origin_type,
      ip.origin_reference,
      0                 AS depth,
      ip.pin_number     AS lineage
    FROM public.inventory_pins ip
    WHERE ip.id = p_pin_id

    UNION ALL

    SELECT
      p.id,
      p.pin_number,
      p.description,
      p.parent_pin_id,
      p.origin_type,
      p.origin_reference,
      a.depth - 1,
      p.pin_number || ' > ' || a.lineage
    FROM public.inventory_pins p
    JOIN anc a ON p.id = a.parent_pin_id
  ),
  -- Descendants: walk downward from the starting PIN
  desc_cte AS (
    SELECT
      ip.id,
      ip.pin_number,
      ip.description,
      ip.parent_pin_id,
      ip.origin_type,
      ip.origin_reference,
      0                 AS depth,
      ip.pin_number     AS lineage
    FROM public.inventory_pins ip
    WHERE ip.id = p_pin_id

    UNION ALL

    SELECT
      c.id,
      c.pin_number,
      c.description,
      c.parent_pin_id,
      c.origin_type,
      c.origin_reference,
      d.depth + 1,
      d.lineage || ' > ' || c.pin_number
    FROM public.inventory_pins c
    JOIN desc_cte d ON c.parent_pin_id = d.id
    WHERE NOT c.id = ANY(ARRAY[p_pin_id])
  )
  -- Combine and de-duplicate (the seed row appears in both CTEs)
  SELECT DISTINCT ON (combined.id)
    combined.id,
    combined.pin_number,
    combined.description,
    combined.parent_pin_id,
    combined.origin_type,
    combined.origin_reference,
    combined.depth,
    combined.lineage
  FROM (
    SELECT * FROM anc
    UNION ALL
    SELECT * FROM desc_cte WHERE depth <> 0
  ) combined
  ORDER BY combined.id, combined.depth;
END;
$$;

-- ------------------------------------------------------------
-- fn_search_inventory
-- Fuzzy / partial-match search across inventory PINs.
-- Requires pg_trgm extension (001_extensions.sql).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_search_inventory(p_query TEXT)
RETURNS TABLE (
  pin_id        UUID,
  pin_number    TEXT,
  description   TEXT,
  current_stock NUMERIC,
  unit          TEXT,
  location_code TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    vis.pin_id,
    vis.pin_number,
    vis.description,
    vis.current_stock,
    vis.unit,
    vis.location_code
  FROM public.v_inventory_status vis
  JOIN public.inventory_pins ip ON ip.id = vis.pin_id
  WHERE
    similarity(ip.description, p_query) > 0.3
    OR ip.pin_number ILIKE '%' || p_query || '%'
    OR ip.part_number ILIKE '%' || p_query || '%'
  ORDER BY similarity(ip.description, p_query) DESC
  LIMIT 20;
$$;

-- ------------------------------------------------------------
-- recalculate_pin_quantity
-- Recomputes the signed running balance for a PIN from its
-- transaction ledger and touches updated_at.
-- Returns the recalculated quantity.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_pin_quantity(p_pin_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_qty NUMERIC;
BEGIN
  SELECT COALESCE(
    SUM(
      CASE transaction_type
        WHEN 'receipt'    THEN  quantity
        WHEN 'return'     THEN  quantity
        WHEN 'adjustment' THEN  quantity
        WHEN 'issue'      THEN -quantity
        WHEN 'transfer'   THEN -quantity
        WHEN 'write_off'  THEN -quantity
        WHEN 'reversal'   THEN  quantity
        ELSE 0
      END
    ), 0
  )
  INTO v_qty
  FROM public.inventory_transactions
  WHERE pin_id = p_pin_id;

  UPDATE public.inventory_pins
  SET    updated_at = now()
  WHERE  id = p_pin_id;

  RETURN v_qty;
END;
$$;
