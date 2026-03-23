-- ── 022: DB-level notification triggers ──
-- These are a safety net. Primary notification creation happens in server actions.
-- DB triggers catch state changes that bypass server actions (e.g. direct SQL).

-- 1. SECURITY DEFINER helper function: inserts a notification bypassing RLS
CREATE OR REPLACE FUNCTION public.create_notification(
  p_recipient_id UUID,
  p_entity_type  TEXT,
  p_entity_id    UUID,
  p_title        TEXT,
  p_body         TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.notifications(recipient_id, entity_type, entity_id, title, body, is_read)
  VALUES (p_recipient_id, p_entity_type, p_entity_id, p_title, p_body, false)
  RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION WHEN OTHERS THEN
  -- Non-fatal: never block a workflow transition because of a notification failure
  RETURN NULL;
END;
$$;

-- 2. Trigger function: notify requirement owner when status changes to approved/rejected/cancelled
CREATE OR REPLACE FUNCTION public.trg_fn_notify_requirement_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requested_by UUID;
  v_ref_number   TEXT;
BEGIN
  -- Only handle requirement entities
  IF NEW.entity_type != 'requirement' THEN RETURN NEW; END IF;
  -- Only on key status transitions
  IF NEW.to_status NOT IN ('approved', 'rejected', 'cancelled') THEN RETURN NEW; END IF;

  SELECT requested_by, ref_number
    INTO v_requested_by, v_ref_number
    FROM public.requirements
   WHERE id = NEW.entity_id;

  IF v_requested_by IS NULL THEN RETURN NEW; END IF;
  -- Don't notify if the requester IS the actor (they know they did it)
  IF v_requested_by = NEW.actor_id THEN RETURN NEW; END IF;

  PERFORM public.create_notification(
    v_requested_by,
    'requirement',
    NEW.entity_id,
    CASE NEW.to_status
      WHEN 'approved'  THEN 'Requirement ' || COALESCE(v_ref_number, '') || ' approved ✅'
      WHEN 'rejected'  THEN 'Requirement ' || COALESCE(v_ref_number, '') || ' was rejected'
      WHEN 'cancelled' THEN 'Requirement ' || COALESCE(v_ref_number, '') || ' was cancelled'
    END,
    CASE NEW.to_status
      WHEN 'approved'  THEN 'Your requirement has been approved and is now with the procurement team.'
      WHEN 'rejected'  THEN COALESCE('Reason: ' || NEW.comment, 'Your requirement was not approved. Please revise and resubmit.')
      WHEN 'cancelled' THEN COALESCE('Reason: ' || NEW.comment, 'Your requirement has been cancelled.')
    END
  );

  RETURN NEW;
END;
$$;

-- Drop old trigger if it existed from earlier work
DROP TRIGGER IF EXISTS trg_workflow_history_notify_req_owner ON public.workflow_history;
DROP TRIGGER IF EXISTS trg_workflow_notify_req_owner ON public.workflow_history;

CREATE TRIGGER trg_workflow_notify_req_owner
  AFTER INSERT ON public.workflow_history
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_notify_requirement_owner();

-- 3. Trigger function: notify requirement requester when inventory is receipted
--    (meaning their ordered item just arrived in stock)
CREATE OR REPLACE FUNCTION public.trg_fn_notify_on_inventory_receipt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pin_desc  TEXT;
  v_req_id    UUID;
  v_req_ref   TEXT;
  v_req_by    UUID;
BEGIN
  -- Only on receipt transactions
  IF NEW.transaction_type != 'receipt' THEN RETURN NEW; END IF;

  -- Get PIN description
  SELECT description INTO v_pin_desc
    FROM public.inventory_pins WHERE id = NEW.pin_id;

  -- Trace back: delivery_item → delivery → purchase_order → requirement
  -- reference_id on inventory_transactions is the delivery_item.id when origin is a delivery
  BEGIN
    SELECT r.id, r.ref_number, r.requested_by
      INTO v_req_id, v_req_ref, v_req_by
      FROM public.delivery_items  di
      JOIN public.deliveries      d   ON d.id  = di.delivery_id
      JOIN public.purchase_orders po  ON po.id = d.po_id
      JOIN public.requirements    r   ON r.id  = po.requirement_id
     WHERE di.id = NEW.reference_id::uuid
     LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW; -- if trace fails, skip notification (non-fatal)
  END;

  IF v_req_by IS NOT NULL AND v_req_id IS NOT NULL THEN
    PERFORM public.create_notification(
      v_req_by,
      'requirement',
      v_req_id,
      'Item now in stock — ' || COALESCE(v_req_ref, ''),
      COALESCE(v_pin_desc, 'Your requested item') ||
        ' has been received and is now available in inventory.'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_receipt_notify ON public.inventory_transactions;

CREATE TRIGGER trg_inventory_receipt_notify
  AFTER INSERT ON public.inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_notify_on_inventory_receipt();
