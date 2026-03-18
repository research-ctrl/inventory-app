-- Views and RPC functions

CREATE OR REPLACE VIEW public.v_requirement_summary AS
SELECT
  r.id, r.ref_number, r.title, r.urgency, r.status, r.required_date,
  p.full_name AS requested_by_name,
  r.vessel_name, r.department, r.created_at
FROM public.requirements r
JOIN public.profiles p ON p.id = r.requested_by;

CREATE OR REPLACE FUNCTION public.recalculate_pin_quantity(p_pin_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_qty NUMERIC;
BEGIN
  SELECT COALESCE(SUM(
    CASE type
      WHEN 'receipt'    THEN quantity
      WHEN 'return'     THEN quantity
      WHEN 'adjustment' THEN quantity
      WHEN 'issue'      THEN -quantity
      WHEN 'transfer'   THEN -quantity
      ELSE 0
    END
  ), 0)
  INTO v_qty
  FROM public.inventory_transactions
  WHERE pin_id = p_pin_id;
  RETURN v_qty;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
