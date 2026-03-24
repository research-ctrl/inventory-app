-- ============================================================
-- 032_release_events.sql
-- Add new workflow events for inventory release
-- ============================================================

ALTER TYPE public.workflow_event ADD VALUE IF NOT EXISTS 'request_approval';
ALTER TYPE public.workflow_event ADD VALUE IF NOT EXISTS 'release_without_approval';
