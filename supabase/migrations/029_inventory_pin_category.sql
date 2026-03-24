-- ============================================================
-- 029_inventory_pin_category.sql
-- Adds explicit item_category to inventory pins
-- (consumable vs returnable) to drive recovery workflow.
-- ============================================================

ALTER TABLE public.inventory_pins
  ADD COLUMN IF NOT EXISTS item_category TEXT
    CHECK (item_category IN ('consumable', 'returnable'))
    DEFAULT 'consumable';

COMMENT ON COLUMN public.inventory_pins.item_category IS 'Determines if the item should be recovered after use (returnable) or is used up (consumable).';

-- Default existing pins based on their current category/description if possible,
-- but for now we'll just set everything to consumable as a safe default.
UPDATE public.inventory_pins SET item_category = 'consumable' WHERE item_category IS NULL;
