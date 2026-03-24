-- ============================================================
-- 027_requirement_form_redesign.sql
-- Part 1 requirement form: item-level inventory linking,
-- request_type tracking, on-behalf-of profile FK,
-- multi-vendor preferences, and data cleanup.
-- ============================================================

-- A. Add inventory_pin_id per line item (replaces the header-level one)
ALTER TABLE public.requirement_items
  ADD COLUMN IF NOT EXISTS inventory_pin_id UUID
    REFERENCES public.inventory_pins(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_requirement_items_inventory_pin
  ON public.requirement_items(inventory_pin_id);

-- B. Item-level request type (to_order / to_enquire_price / to_release_from_inventory)
ALTER TABLE public.requirement_items
  ADD COLUMN IF NOT EXISTS item_request_type TEXT
    CHECK (item_request_type IN ('to_order','to_enquire_price','to_release_from_inventory'));

-- C. Form-level request type on requirements (derived from items)
ALTER TABLE public.requirements
  ADD COLUMN IF NOT EXISTS request_type TEXT
    CHECK (request_type IN ('to_order','to_enquire_price','to_release_from_inventory','mixed'));

CREATE INDEX IF NOT EXISTS idx_requirements_request_type
  ON public.requirements(request_type);

-- D. Free-text vendor suggestion (for vendors not in the system)
ALTER TABLE public.requirements
  ADD COLUMN IF NOT EXISTS preferred_vendor_free_text TEXT;

-- E. Profile-linked on-behalf-of (when the person is a registered user)
ALTER TABLE public.requirements
  ADD COLUMN IF NOT EXISTS requested_on_behalf_of_profile_id UUID
    REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_requirements_on_behalf_profile
  ON public.requirements(requested_on_behalf_of_profile_id);

-- F. Vessel cleanup — keep only RORORO Landing Craft 55 meters (RINA)
--    Mark others inactive so they disappear from new-request dropdowns.
--    Existing requirements that reference other vessels are not affected.
UPDATE public.vessels
  SET is_active = false
  WHERE name NOT ILIKE '%roro%'
    AND name NOT ILIKE '%landing craft%';

-- G. Department cleanup — keep only Procurement
UPDATE public.departments
  SET is_active = false
  WHERE name NOT ILIKE '%procurement%';

-- H. Ensure vessel exists (upsert to avoid duplicate if migration runs twice)
INSERT INTO public.vessels (name, vessel_type, is_active)
SELECT 'RORORO Landing Craft 55 meters (RINA)', 'landing_craft', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.vessels WHERE name ILIKE '%roro%landing%'
);

-- I. Ensure Procurement department exists
INSERT INTO public.departments (code, name, is_active)
SELECT 'PROC', 'Procurement', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.departments WHERE name ILIKE '%procurement%'
);
