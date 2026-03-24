-- ============================================================
-- 030_scrap_log.sql
-- Audit log for item write-offs (scrap)
-- Captures reason, actor, and provenance.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.scrap_logs (
  id           UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
  pin_id       UUID               NOT NULL REFERENCES public.inventory_pins(id),
  issue_id     UUID               REFERENCES public.material_issues(id), -- optional, if scrapped from an issue
  recovery_id  UUID               REFERENCES public.recoveries(id),      -- optional, if scrapped after return
  quantity     NUMERIC(12,3)      NOT NULL CHECK (quantity > 0),
  unit         TEXT               NOT NULL,
  reason       TEXT               NOT NULL,
  actor_id     UUID               NOT NULL REFERENCES public.profiles(id),
  created_at   TIMESTAMPTZ        NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scrap_logs_pin_id      ON public.scrap_logs(pin_id);
CREATE INDEX IF NOT EXISTS idx_scrap_logs_issue_id    ON public.scrap_logs(issue_id);
CREATE INDEX IF NOT EXISTS idx_scrap_logs_recovery_id ON public.scrap_logs(recovery_id);
CREATE INDEX IF NOT EXISTS idx_scrap_logs_actor_id    ON public.scrap_logs(actor_id);

COMMENT ON TABLE public.scrap_logs IS 'Audit log of items removed from inventory with result scrap/write-off.';
